import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  players: [{
    id: String, // socket id or persistent user id
    name: String,
    score: { type: Number, default: 0 },
    role: { type: String, default: null }, // batsman, bowler
    isReady: { type: Boolean, default: false }
  }],
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
  winner: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
});

export const Room = mongoose.model('Room', roomSchema);
