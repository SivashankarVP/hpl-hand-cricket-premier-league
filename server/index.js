import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { Room } from './models/Room.js';
import { User } from './models/User.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

const TIMEOUT_DURATION = 10000; // 10 seconds per move

io.on('connection', (socket) => {
  console.log('⚡ Player connected:', socket.id);

  socket.on('createRoom', async ({ username }) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom = await Room.create({
        roomId,
        players: [{ id: socket.id, name: username, score: 0 }],
        gameState: 'LOBBY'
      });
      socket.join(roomId);
      socket.emit('roomCreated', newRoom);
    } catch (err) {
      socket.emit('error', 'Failed to create room');
    }
  });

  socket.on('joinRoom', async ({ roomId, username }) => {
    try {
      let room = await Room.findOne({ roomId: roomId.toUpperCase() });
      
      if (!room) {
        // Automatically create and generate the room if it doesn't exist
        room = await Room.create({
          roomId: roomId.toUpperCase(),
          players: [{ id: socket.id, name: username, score: 0 }],
          gameState: 'LOBBY'
        });
        socket.join(roomId);
        socket.emit('roomCreated', room);
        console.log(`🏨 Room ${room.roomId} auto-created for ${username}`);
      } else {
        if (room.players.length >= 2) return socket.emit('error', 'Room is full');

        room.players.push({ id: socket.id, name: username, score: 0 });
        room.gameState = 'TOSS';
        await room.save();

        socket.join(roomId);
        io.to(roomId).emit('playerJoined', room);
        console.log(`👤 ${username} joined ${roomId}`);
      }
    } catch (err) {
      socket.emit('error', 'Failed to join/create room');
    }
  });

  // --- ODD/EVEN TOSS LOGIC ---
  socket.on('tossChoice', async ({ roomId, choice }) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;
    
    // Store Player 1's choice
    room.lastMoves.set('toss_choice', choice === 'even' ? 0 : 1); // 0=even, 1=odd
    await room.save();
    io.to(roomId).emit('tossChoiceLocked', { choice });
  });

  socket.on('sendTossNumber', async ({ roomId, number }) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    room.lastMoves.set(socket.id, number);
    await room.save();

    if (room.lastMoves.size === 3) { // Choice + 2 player numbers
      const p1 = room.players[0];
      const p2 = room.players[1];
      const n1 = room.lastMoves.get(p1.id);
      const n2 = room.lastMoves.get(p2.id);
      const choice = room.lastMoves.get('toss_choice') === 0 ? 'even' : 'odd';

      const sum = n1 + n2;
      const result = sum % 2 === 0 ? 'even' : 'odd';
      const winnerIdx = result === choice ? 0 : 1;
      const tossWinner = room.players[winnerIdx];

      room.gameState = 'ROLE_SELECT';
      room.lastMoves = new Map();
      await room.save();

      io.to(roomId).emit('tossResult', { 
        winnerId: tossWinner.id, 
        winnerName: tossWinner.name,
        result,
        sum,
        numbers: { [p1.id]: n1, [p2.id]: n2 }
      });
    }
  });

  socket.on('selectRole', async ({ roomId, role }) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    const winnerId = socket.id;
    room.players.forEach(p => {
      if (p.id === winnerId) p.role = role === 'batting' ? 'batsman' : 'bowler';
      else p.role = role === 'batting' ? 'bowler' : 'batsman';
    });

    room.gameState = 'PLAYING';
    await room.save();
    io.to(roomId).emit('gameStarted', room);
  });

  socket.on('sendNumber', async ({ roomId, number }) => {
    const room = await Room.findOne({ roomId });
    if (!room || room.gameState !== 'PLAYING') return;

    room.lastMoves.set(socket.id, number);
    await room.save();

    if (room.lastMoves.size === 2) {
      await processMove(room);
    }
  });

  socket.on('sendMessage', ({ roomId, message, username }) => {
    io.to(roomId).emit('messageReceived', { message, username, senderId: socket.id });
  });

  socket.on('sendReaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reactionReceived', { emoji, senderId: socket.id });
  });

  async function processMove(room) {
    const batsman = room.players.find(p => p.role === 'batsman');
    const bowler = room.players.find(p => p.role === 'bowler');
    const batMove = room.lastMoves.get(batsman.id);
    const bowlMove = room.lastMoves.get(bowler.id);

    room.history.push({ 
        batsman: batsman.name, 
        bowler: bowler.name, 
        batMove, 
        bowlMove 
    });

    if (batMove === bowlMove) {
      if (room.innings === 1) {
        room.innings = 2;
        room.target = batsman.score + 1;
        room.players.forEach(p => p.role = (p.role === 'batsman' ? 'bowler' : 'batsman'));
        room.lastMoves = new Map();
        await room.save();
        io.to(room.roomId).emit('playerOut', { room, type: 'innings' });
      } else {
        room.gameState = 'FINISHED';
        room.winner = bowler.id;
        await room.save();
        io.to(room.roomId).emit('matchResult', room);
      }
    } else {
      batsman.score += batMove;
      if (room.innings === 2 && batsman.score >= room.target) {
        room.gameState = 'FINISHED';
        room.winner = batsman.id;
        await room.save();
        io.to(room.roomId).emit('matchResult', room);
      } else {
        room.lastMoves = new Map();
        await room.save();
        io.to(room.roomId).emit('updateScore', { 
            room, 
            lastResult: { batMove, bowlMove, batsmanName: batsman.name } 
        });
      }
    }
  }

  socket.on('disconnect', () => {
    console.log('Player disconnected');
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 HPL Server v2 running on port ${PORT}`);
});
