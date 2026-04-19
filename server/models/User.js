import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: { type: String, default: '🏏' },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 }
  },
  lastActive: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
