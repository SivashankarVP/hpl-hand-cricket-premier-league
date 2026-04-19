"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Info, Hash, ChevronRight, Moon, Sun, User as UserIcon, BarChart3, LogOut } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
import HowToPlay from '@/components/Game/HowToPlay';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socket = useSocket();
  const { user, setUser, theme, toggleTheme, logout } = useStore();
  
  const [usernameInput, setUsernameInput] = useState(user?.username || "");
  const [roomCode, setRoomCode] = useState("");
  const [showHowTo, setShowHowTo] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) setRoomCode(roomParam.toUpperCase());

    if (!socket) return;
    socket.on('roomCreated', (room) => {
        router.push(`/room/${room.roomId}`);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setLoading(false);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('error');
    };
  }, [socket, searchParams]);

  const handleStartGame = (mode: 'create' | 'join' | 'demo') => {
    if (!usernameInput.trim()) {
      setError("Please pick a name!");
      return;
    }

    // Save user to store
    if (!user || user.username !== usernameInput) {
        setUser({ username: usernameInput, avatar: '🏏' });
    }

    if (mode === 'create') {
        setLoading(true);
        socket.emit('createRoom', { username: usernameInput });
    } else if (mode === 'join') {
        if (!roomCode) return setError("Enter a room code!");
        router.push(`/room/${roomCode.toUpperCase()}`);
    } else if (mode === 'demo') {
        router.push('/demo');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col transition-colors duration-300">
      {/* Navbar / Header */}
      <div className="p-6 flex justify-between items-center max-w-5xl mx-auto w-full">
         <div className="flex flex-col">
            <h1 className="text-4xl font-black italic gold-text tracking-tighter">HPL</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)] opacity-80">Premier League</p>
         </div>

         <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[var(--foreground)]"
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {user && (
                <button 
                  onClick={logout}
                  className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-red-500/10 hover:border-red-500/20 text-red-400 transition-all"
                >
                   <LogOut size={20} />
                </button>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 w-full max-w-md"
        >
          {/* Dashboard for Logged In User */}
          {user ? (
              <div className="glass p-6 rounded-[2.5rem] border border-white/10 mb-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center text-3xl border border-blue-500/20">
                        {user.avatar}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400">Welcome Back</p>
                        <h2 className="text-2xl font-black italic tracking-tight">{user.username}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                        <p className="text-[9px] uppercase font-bold text-gray-500">Wins</p>
                        <p className="text-lg font-black text-emerald-500">{user.stats?.wins || 0}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                        <p className="text-[9px] uppercase font-bold text-gray-500">Highest</p>
                        <p className="text-lg font-black text-yellow-500">{user.stats?.highestScore || 0}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                        <p className="text-[9px] uppercase font-bold text-gray-500">Matches</p>
                        <p className="text-lg font-black text-blue-500">{user.stats?.matchesPlayed || 0}</p>
                    </div>
                </div>
              </div>
          ) : (
            <div className="glass p-8 rounded-[2.5rem] border border-white/10 mb-6 text-center space-y-4">
                <div className="inline-flex p-4 rounded-3xl bg-yellow-500/10 text-yellow-500 mb-2">
                    <UserIcon size={32} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Claim Your Username</h2>
                <input 
                  type="text" 
                  placeholder="e.g. MasterBlaster"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-yellow-500/50 transition-all text-center font-bold text-lg"
                />
            </div>
          )}

          <div className="space-y-4">
            <button 
              disabled={loading}
              onClick={() => handleStartGame('create')}
              className="w-full hpl-gradient p-5 rounded-[2rem] flex items-center justify-between border-b-4 border-blue-900 group active:translate-y-1 active:border-b-0 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-yellow-500">
                    <Trophy size={24} />
                </div>
                <div className="text-left">
                    <p className="font-black italic text-lg leading-none mb-1">CREATE MATCH</p>
                    <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Start a new room</p>
                </div>
              </div>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative group">
              <input 
                type="text" 
                placeholder="ENTER ROOM CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 pr-32 outline-none focus:border-emerald-500/50 transition-all font-black text-center tracking-[0.2em]"
              />
              <button 
                onClick={() => handleStartGame('join')}
                className="absolute right-2 top-2 bottom-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-6 rounded-3xl text-sm font-black transition-all"
              >
                JOIN
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                  onClick={() => router.push('/demo')}
                  className="bg-white/5 hover:bg-white/10 py-4 rounded-3xl flex flex-col items-center gap-1 border border-white/5 active:scale-95 transition-all"
                >
                  <Play size={20} className="text-yellow-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Demo Mode</span>
                </button>
                <button 
                  onClick={() => setShowHowTo(true)}
                  className="bg-white/5 hover:bg-white/10 py-4 rounded-3xl flex flex-col items-center gap-1 border border-white/5 active:scale-95 transition-all"
                >
                  <Info size={20} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">How to Play</span>
                </button>
            </div>
          </div>
        </motion.div>
      </div>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />

      {/* Footer Decal */}
      <div className="p-8 text-center opacity-30 pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Score Big • Play Smart</p>
      </div>
    </main>
  );
}
