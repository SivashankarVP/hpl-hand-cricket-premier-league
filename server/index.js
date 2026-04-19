import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (username) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomData = {
      roomId,
      players: [{ id: socket.id, name: username, score: 0, role: null }],
      gameState: 'LOBBY',
      innings: 1,
      target: null,
      history: [],
      lastMoves: {},
      winner: null
    };
    rooms.set(roomId, roomData);
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, players: roomData.players });
    console.log(`Room created: ${roomId} by ${username}`);
  });

  socket.on('joinRoom', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }

    room.players.push({ id: socket.id, name: username, score: 0, role: null });
    socket.join(roomId);
    
    // Start the game if 2 players are present
    if (room.players.length === 2) {
      room.gameState = 'TOSS';
      // Decide who calls for the toss (Player 1 usually)
      io.to(roomId).emit('tossStarted', { players: room.players });
    } else {
      io.to(roomId).emit('playerJoined', { players: room.players });
    }
  });

  socket.on('tossChoice', ({ roomId, choice }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Simulate toss
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerIdx = result === choice ? 0 : 1;
    const tossWinner = room.players[winnerIdx];

    io.to(roomId).emit('tossResult', { 
      winnerId: tossWinner.id, 
      winnerName: tossWinner.name,
      result 
    });
  });

  socket.on('selectRole', ({ roomId, role }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const winnerId = socket.id;
    const opponent = room.players.find(p => p.id !== winnerId);
    
    if (role === 'batting') {
      room.players.find(p => p.id === winnerId).role = 'batsman';
      opponent.role = 'bowler';
    } else {
      room.players.find(p => p.id === winnerId).role = 'bowler';
      opponent.role = 'batsman';
    }

    room.gameState = 'PLAYING';
    io.to(roomId).emit('gameStarted', { room });
  });

  socket.on('makeMove', ({ roomId, move }) => {
    const room = rooms.get(roomId);
    if (!room || room.gameState !== 'PLAYING') return;

    room.lastMoves[socket.id] = move;

    const playerIds = room.players.map(p => p.id);
    if (room.lastMoves[playerIds[0]] !== undefined && room.lastMoves[playerIds[1]] !== undefined) {
      // Both players made a move
      processMove(roomId);
    }
  });

  socket.on('sendReaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reactionReceived', { emoji, senderId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find room where user was present
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('playerDisconnected', { roomId });
        }
        break;
      }
    }
  });

  function processMove(roomId) {
    const room = rooms.get(roomId);
    const p1 = room.players[0];
    const p2 = room.players[1];
    const m1 = room.lastMoves[p1.id];
    const m2 = room.lastMoves[p2.id];

    const batsman = room.players.find(p => p.role === 'batsman');
    const bowler = room.players.find(p => p.role === 'bowler');
    const batMove = room.lastMoves[batsman.id];
    const bowlMove = room.lastMoves[bowler.id];

    room.history.push({ batsman: batsman.id, bowler: bowler.id, batMove, bowlMove });

    if (batMove === bowlMove) {
      // OUT!
      if (room.innings === 1) {
        // Swap roles for 2nd innings
        room.innings = 2;
        room.target = batsman.score + 1;
        room.players.forEach(p => {
          p.role = p.role === 'batsman' ? 'bowler' : 'batsman';
        });
        room.lastMoves = {};
        io.to(roomId).emit('inningsOver', { 
          room, 
          message: `${batsman.name} is OUT! Target: ${room.target}` 
        });
      } else {
        // Game Over - innings 2 batsman is out
        room.gameState = 'FINISHED';
        const firstInningsScore = room.target - 1;
        const secondInningsScore = batsman.score;

        if (secondInningsScore < firstInningsScore) {
          room.winner = bowler.id;
        } else if (secondInningsScore === firstInningsScore - 1) {
           room.winner = 'DRAW';
        } else {
           // This case should be handled during the move actually
        }
        io.to(roomId).emit('gameOver', { room });
      }
    } else {
      // Runs added
      batsman.score += batMove;
      
      // Check if 2nd innings target reached
      if (room.innings === 2 && batsman.score >= room.target) {
        room.gameState = 'FINISHED';
        room.winner = batsman.id;
        io.to(roomId).emit('gameOver', { room });
      } else {
        io.to(roomId).emit('moveResult', { 
          room, 
          lastResult: { batMove, bowlMove, batsmanName: batsman.name } 
        });
      }
    }

    room.lastMoves = {};
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
