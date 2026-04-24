import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { Room } from './models/Room.js';
import { User } from './models/User.js';
import { getBotMove, BotDifficulty } from './utils/aiEngine.js';

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

  socket.on('createRoom', async ({ username, matchMode, maxOvers, maxWickets }) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom = await Room.create({
        roomId,
        players: [{ id: socket.id, name: username, score: 0 }],
        matchMode: matchMode || 'SINGLE_WICKET',
        maxOvers: maxOvers || 0,
        maxWickets: maxWickets || 1,
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
        const alreadyIn = room.players.find(p => p.id === socket.id);
        if (alreadyIn) {
            socket.join(roomId);
            return socket.emit('playerJoined', room);
        }

        if (room.players.length >= 2) return socket.emit('error', 'Room is full');

        room.players.push({ id: socket.id, name: username, score: 0 });
        room.gameState = 'TOSS';
        await room.save();

        socket.join(roomId);
        io.to(roomId).emit('playerJoined', room);
        console.log(`👤 ${username} joined ${roomId}`);
      }
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  socket.on('createBotRoom', async ({ username, difficulty, matchMode, maxOvers, maxWickets }) => {
    try {
      const roomId = `BOT_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const bot = { 
        id: 'BOT_ID', 
        name: `${difficulty} BOT`, 
        score: 0, 
        isBot: true 
      };
      
      const newRoom = await Room.create({
        roomId,
        players: [
          { id: socket.id, name: username, score: 0, isBot: false },
          bot
        ],
        isBotRoom: true,
        botDifficulty: difficulty,
        matchMode: matchMode || 'SINGLE_WICKET',
        maxOvers: maxOvers || 0,
        maxWickets: maxWickets || 1,
        gameState: 'TOSS'
      });
      
      socket.join(roomId);
      socket.emit('roomCreated', newRoom);
      console.log(`🤖 Bot room ${roomId} created with ${difficulty} bot in ${matchMode} mode`);
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Failed to create bot room');
    }
  });

  socket.on('syncUser', async ({ username }) => {
     try {
        let user = await User.findOne({ username });
        if (!user) {
            user = await User.create({ username });
        }
        socket.emit('userSynced', user);
     } catch (err) {
        socket.emit('error', 'User sync failed');
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

    if (room.isBotRoom) {
        // Bot automatically "sends" its number after a delay
        setTimeout(() => handleBotTossNumber(room.roomId), 1000);
    }
  });

  async function handleBotTossNumber(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) return;
    const bot = room.players.find(p => p.isBot);
    const botNumber = Math.floor(Math.random() * 6) + 1;
    
    room.lastMoves.set(bot.id, botNumber);
    await room.save();
    
    if (room.lastMoves.size === 3) {
        finalizeToss(room);
    }
  }

  async function finalizeToss(room) {
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

    io.to(room.roomId).emit('tossResult', { 
      winnerId: tossWinner.id, 
      winnerName: tossWinner.name,
      result,
      sum,
      numbers: { [p1.id]: n1, [p2.id]: n2 }
    });

    if (room.isBotRoom && tossWinner.isBot) {
        const botRole = Math.random() < 0.5 ? 'batting' : 'bowling';
        setTimeout(async () => {
            const updatedRoom = await Room.findOne({ roomId: room.roomId });
            if (!updatedRoom) return;
            updatedRoom.players.forEach(p => {
               if (p.isBot) p.role = botRole === 'batting' ? 'batsman' : 'bowler';
               else p.role = botRole === 'batting' ? 'bowler' : 'batsman';
            });
            updatedRoom.gameState = 'PLAYING';
            await updatedRoom.save();
            io.to(room.roomId).emit('gameStarted', updatedRoom);
        }, 1500);
    }
  }

  socket.on('sendTossNumber', async ({ roomId, number }) => {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    room.lastMoves.set(socket.id, number);
    await room.save();

    if (room.lastMoves.size === 3) {
      await finalizeToss(room);
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
    } else if (room.isBotRoom) {
      // Trigger bot move
      handleBotMove(room);
    }
  });

  async function handleBotMove(room) {
    const bot = room.players.find(p => p.isBot);
    const player = room.players.find(p => !p.isBot);
    
    if (room.lastMoves.has(bot.id)) return; // Already moved

    // Get player history for AI
    const playerHistory = room.history.map(h => h.batsman === player.name ? h.batMove : h.bowlMove);
    
    const botMove = getBotMove(
        room.botDifficulty, 
        { 
            target: room.target, 
            botScore: bot.score,
            lastBotMove: room.history.length > 0 ? (bot.role === 'batsman' ? room.history[room.history.length-1].batMove : room.history[room.history.length-1].bowlMove) : null
        }, 
        playerHistory, 
        bot.role
    );

    // Small delay to simulate thinking
    setTimeout(async () => {
        const freshRoom = await Room.findOne({ roomId: room.roomId });
        if (!freshRoom || freshRoom.gameState !== 'PLAYING') return;
        
        freshRoom.lastMoves.set(bot.id, botMove);
        await freshRoom.save();
        
        if (freshRoom.lastMoves.size === 2) {
            await processMove(freshRoom);
        }
    }, 1000 + Math.random() * 1000);
  }

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
    
    room.currentBalls += 1;

    let inningsEnded = false;
    let gameEnded = false;

    if (batMove === bowlMove) {
      room.currentWickets += 1;
      if (room.currentWickets >= room.maxWickets) {
        inningsEnded = true;
      }
    } else {
      batsman.score += batMove;
      if (room.innings === 2 && batsman.score >= room.target) {
        gameEnded = true;
      }
    }

    // Check Overs Limit
    if (room.matchMode === 'OVERS' && !inningsEnded && !gameEnded) {
       if (room.currentBalls >= room.maxOvers * 6) {
          inningsEnded = true;
       }
    }

    if (gameEnded) {
        room.gameState = 'FINISHED';
        room.winner = batsman.id;
        await room.save();
        io.to(room.roomId).emit('matchResult', { room, lastResult: { batMove, bowlMove } });
        
        // Update DB Stats
        try {
            await User.findOneAndUpdate({ username: batsman.name }, { $inc: { 'stats.wins': 1, 'stats.matchesPlayed': 1 }, $set: { lastActive: new Date() } });
            await User.findOneAndUpdate({ username: bowler.name }, { $inc: { 'stats.losses': 1, 'stats.matchesPlayed': 1 }, $set: { lastActive: new Date() } });
        } catch (e) {}
    } else if (inningsEnded) {
      if (room.innings === 1) {
        room.innings = 2;
        room.target = batsman.score + 1;
        room.currentWickets = 0;
        room.currentBalls = 0;
        room.players.forEach(p => p.role = (p.role === 'batsman' ? 'bowler' : 'batsman'));
        room.lastMoves = new Map();
        await room.save();
        io.to(room.roomId).emit('playerOut', { room, type: 'innings', lastResult: { batMove, bowlMove } });
      } else {
        // Runner runs out in 2nd innings
        room.gameState = 'FINISHED';
        room.winner = bowler.id;
        await room.save();
        io.to(room.roomId).emit('matchResult', { room, lastResult: { batMove, bowlMove } });

        // Update DB Stats
        try {
            await User.findOneAndUpdate({ username: bowler.name }, { $inc: { 'stats.wins': 1, 'stats.matchesPlayed': 1 }, $set: { lastActive: new Date() } });
            await User.findOneAndUpdate({ username: batsman.name }, { $inc: { 'stats.losses': 1, 'stats.matchesPlayed': 1 }, $set: { lastActive: new Date() } });
        } catch (e) {}
      }
    } else {
      room.lastMoves = new Map();
      await room.save();
      io.to(room.roomId).emit('updateScore', { 
          room, 
          lastResult: { batMove, bowlMove, batsmanName: batsman.name, isOut: batMove === bowlMove } 
      });
    }

    // 🤖 TRIGGER BOT MOVE IF APPLICABLE
    if (room.isBotRoom && room.gameState === 'PLAYING') {
        setTimeout(() => handleBotMove(room), 1500); 
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
