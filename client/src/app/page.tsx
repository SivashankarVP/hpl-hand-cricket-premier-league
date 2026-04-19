"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Play, Info, Hash, LogIn, ChevronRight, Share2, Copy } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import Arena from '@/components/Game/Arena';
import HowToPlay from '@/components/Game/HowToPlay';

export default function Home() {
  const socket = useSocket();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [inGame, setInGame] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomCreated', ({ roomId, players }) => {
      setActiveRoom({ roomId, players, status: 'LOBBY' });
      setInGame(true);
    });

    socket.on('playerJoined', ({ players }) => {
      setActiveRoom(prev => ({ ...prev, players }));
    });

    socket.on('tossStarted', ({ players }) => {
      setActiveRoom(prev => ({ ...prev, players, status: 'TOSS' }));
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('playerJoined');
      socket.off('tossStarted');
      socket.off('error');
    };
  }, [socket]);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    socket.emit('createRoom', username);
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomId.trim()) {
      setError("Please enter username and Room ID");
      return;
    }
    socket.emit('joinRoom', { roomId: roomId.toUpperCase(), username });
  };

  const startDemo = () => {
    if (!username.trim()) {
      setUsername("Player");
    }
    setIsDemo(true);
    setInGame(true);
  };

  if (inGame) {
    return <Arena 
      room={activeRoom} 
      username={username} 
      isDemo={isDemo} 
      onExit={() => { setInGame(false); setIsDemo(false); setActiveRoom(null); }} 
    />;
  }

  return (
    <main className="min-h-screen hpl-gradient flex flex-col items-center justify-center p-4">
      {/* Background Decals */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-yellow-500 blur-[100px]" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-blue-500 blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block p-4 mb-4"
          >
            <h1 className="text-6xl font-black italic gold-text tracking-tighter">HPL</h1>
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-gray-400 mt-1">Hand Cricket Premier League</p>
            <p className="text-[10px] italic text-gray-500 font-medium">"Play Smart. Score Big."</p>
          </motion.div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/10 space-y-6">
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 ml-1">Your Name</label>
            <input 
              type="text" 
              placeholder="e.g. King Kohli"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-500/50 transition-all text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-blue-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
            >
              <Trophy size={20} />
              CREATE MATCH
              <ChevronRight size={18} />
            </button>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Hash size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Enter Room Code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 pr-32 outline-none focus:border-emerald-500/50 transition-all text-white font-medium"
              />
              <button 
                onClick={handleJoinRoom}
                className="absolute right-2 top-2 bottom-2 bg-white/10 hover:bg-white/20 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                JOIN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={startDemo}
                className="bg-white/5 hover:bg-white/10 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-white/5"
              >
                <Play size={16} className="text-yellow-500" />
                DEMO MODE
              </button>
              <button 
                onClick={() => setShowHowTo(true)}
                className="bg-white/5 hover:bg-white/10 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-white/5"
              >
                <Info size={16} className="text-blue-400" />
                HOW TO PLAY
              </button>
          </div>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-gray-500 font-medium tracking-tight">HPL v1.0 • Built for Champions</p>
          <div className="flex justify-center gap-4 text-gray-600">
             {/* Stats would go here if implemented */}
          </div>
        </div>
      </motion.div>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
    </main>
  );
}
