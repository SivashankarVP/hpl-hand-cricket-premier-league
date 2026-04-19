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

// Utility to find or create a user (Simplified Profile system)
async function getOrCreateUser(username) {
    let user = await User.findOne({ username });
    if (!user) {
        user = await User.create({ username });
    }
    return user;
}

io.on('connection', (socket) => {
  console.log('⚡ Player connected:', socket.id);

  socket.on('createRoom', async ({ username }) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const user = await getOrCreateUser(username);
      
      const newRoom = await Room.create({
        roomId,
        players: [{ id: socket.id, name: username, score: 0 }],
        gameState: 'LOBBY'
      });

      socket.join(roomId);
      socket.emit('roomCreated', newRoom);
      console.log(`🏨 Room ${roomId} created by ${username}`);
    } catch (err) {
      socket.emit('error', 'Failed to create room');
    }
  });

  socket.on('joinRoom', async ({ roomId, username }) => {
    try {
      const room = await Room.findOne({ roomId: roomId.toUpperCase() });
      if (!room) return socket.emit('error', 'Room not found');
      if (room.players.length >= 2) return socket.emit('error', 'Room is full');

      room.players.push({ id: socket.id, name: username, score: 0 });
      room.gameState = 'TOSS';
      await room.save();

      socket.join(roomId);
      io.to(roomId).emit('playerJoined', room);
      console.log(`👤 ${username} joined ${roomId}`);
    } catch (err) {
      socket.emit('error', 'Failed to join room');
    }
  });

  socket.on('tossChoice', async ({ roomId, choice }) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerIdx = result === choice ? 0 : 1;
    const tossWinner = room.players[winnerIdx];

    io.to(roomId).emit('tossResult', { 
      winnerId: tossWinner.id, 
      winnerName: tossWinner.name,
      result 
    });
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

  socket.on('makeMove', async ({ roomId, move }) => {
    const room = await Room.findOne({ roomId });
    if (!room || room.gameState !== 'PLAYING') return;

    room.lastMoves.set(socket.id, move);
    await room.save();

    if (room.lastMoves.size === 2) {
      await processMove(room);
    }
  });

  socket.on('sendReaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reactionReceived', { emoji, senderId: socket.id });
  });

  socket.on('disconnect', async () => {
    console.log('❌ Player disconnected:', socket.id);
    const room = await Room.findOne({ "players.id": socket.id });
    if (room) {
        // In a real app, we'd wait for reconnection
        // For now, Notify other player but keep room for 5 mins
        io.to(room.roomId).emit('playerDisconnected', { id: socket.id });
    }
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
      // OUT
      if (room.innings === 1) {
        room.innings = 2;
        room.target = batsman.score + 1;
        room.players.forEach(p => p.role = (p.role === 'batsman' ? 'bowler' : 'batsman'));
        room.lastMoves = new Map();
        await room.save();
        io.to(room.roomId).emit('inningsOver', room);
      } else {
        // Match Over
        room.gameState = 'FINISHED';
        room.winner = bowler.id;
        await updateStats(room);
        await room.save();
        io.to(room.roomId).emit('gameOver', room);
      }
    } else {
      batsman.score += batMove;
      
      if (room.innings === 2 && batsman.score >= room.target) {
        room.gameState = 'FINISHED';
        room.winner = batsman.id;
        await updateStats(room);
        await room.save();
        io.to(room.roomId).emit('gameOver', room);
      } else {
        room.lastMoves = new Map();
        await room.save();
        io.to(room.roomId).emit('moveResult', { 
            room, 
            lastResult: { batMove, bowlMove, batsmanName: batsman.name } 
        });
      }
    }
  }

  async function updateStats(room) {
    for (const player of room.players) {
        const user = await User.findOne({ username: player.name });
        if (user) {
            user.stats.matchesPlayed += 1;
            if (player.id === room.winner) user.stats.wins += 1;
            else if (room.winner !== 'DRAW') user.stats.losses += 1;
            if (player.score > user.stats.highestScore) user.stats.highestScore = player.score;
            await user.save();
        }
    }
  }
});

// API Routes for stats
app.get('/api/stats/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Production Server running on port ${PORT}`);
});
