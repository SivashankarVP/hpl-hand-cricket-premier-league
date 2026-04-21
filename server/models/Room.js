import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  players: [{
    id: String, // socket id or persistent user id
    name: String,
    score: { type: Number, default: 0 },
    role: { type: String, default: null }, // batsman, bowler
    isReady: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false }
  }],
  isBotRoom: { type: Boolean, default: false },
  botDifficulty: { type: String, enum: ['BASIC', 'MEDIUM', 'HIGH', 'ULTRA'], default: 'BASIC' },
  gameState: { 
    type: String, 
    enum: ['LOBBY', 'TOSS', 'ROLE_SELECT', 'PLAYING', 'FINISHED'], 
    default: 'LOBBY' 
  },
  innings: { type: Number, default: 1 },
  target: { type: Number, default: null },
  history: [{
    batsman: String,
    bowler: String,
    batMove: Number,
    bowlMove: Number
  }],
  lastMoves: { type: Map, of: Number, default: {} },
  matchMode: { type: String, enum: ['SINGLE_WICKET', 'OVERS', 'TEST'], default: 'SINGLE_WICKET' },
  maxOvers: { type: Number, default: 0 }, // 0 means unlimited
  maxWickets: { type: Number, default: 1 },
  currentWickets: { type: Number, default: 0 },
  currentBalls: { type: Number, default: 0 },
  winner: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
});

export const Room = mongoose.model('Room', roomSchema);
