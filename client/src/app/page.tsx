"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Info, ChevronRight, Moon, Sun, User as UserIcon, LogOut, Medal, Zap, ShieldCheck, Gamepad2, Settings2, Activity, Cpu, Globe } from 'lucide-react';
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
  const [difficulty, setDifficulty] = useState<'BASIC' | 'MEDIUM' | 'HIGH' | 'ULTRA'>('BASIC');
  const [matchMode, setMatchMode] = useState<'SINGLE_WICKET' | 'OVERS' | 'TEST'>('SINGLE_WICKET');
  const [oversConfig, setOversConfig] = useState(2);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) setRoomCode(roomParam.toUpperCase());

    if (!socket) return;
    socket.on('roomCreated', (room) => router.push(`/room/${room.roomId}`));
    socket.on('error', (msg) => { setError(msg); setTimeout(() => setError(""), 3000); });
    socket.on('userSynced', (dbUser) => setUser(dbUser));
    return () => { socket.off('roomCreated'); socket.off('error'); socket.off('userSynced'); };
  }, [socket, searchParams]);

  useEffect(() => {
    if (socket && user?.username) {
        socket.emit('syncUser', { username: user.username });
    }
  }, [socket, user?.username]);

  const handleStartGame = (mode: 'create' | 'join' | 'bot') => {
    let finalUsername = usernameInput.trim();
    if (!finalUsername) {
      finalUsername = `UNIT_${Math.floor(Math.random() * 9000) + 1000}`;
      setUsernameInput(finalUsername);
    }
    if (!user || user.username !== finalUsername) {
        setUser({ username: finalUsername, avatar: '🤖' });
    }

    const payload = { 
        username: finalUsername, 
        matchMode, 
        maxOvers: matchMode === 'OVERS' ? oversConfig : 0, 
        maxWickets: matchMode === 'TEST' ? 10 : 1 
    };

    if (mode === 'create') socket.emit('createRoom', payload);
    else if (mode === 'join') {
        if (!roomCode) return setError("INPUT CODE REQUIRED");
        router.push(`/room/${roomCode.toUpperCase()}`);
    } else if (mode === 'bot') {
        socket.emit('createBotRoom', { ...payload, difficulty });
    }
  };

  return (
    <div className="game-container">
      {/* 🌌 Animated Particle Background */}
      <div className="particle-container">
          {[...Array(20)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ 
                    y: [0, -1000], 
                    opacity: [0, 1, 0],
                    x: Math.random() * 400
                }}
                transition={{ 
                    duration: Math.random() * 10 + 5, 
                    repeat: Infinity, 
                    delay: Math.random() * 5 
                }}
                className="particle"
                style={{ left: `${Math.random() * 100}%`, top: '110%' }}
              />
          ))}
      </div>

      <div className="scanline" />
      
      {/* 🚀 NEON HEADER */}
      <div className="p-8 pb-4 flex justify-between items-center z-20">
         <div className="flex flex-col">
            <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-cyber neon-text tracking-tighter leading-none mb-2"
            >
                HPL // 2077
            </motion.h1>
            <p className="text-[7px] font-sync text-cyan-500 opacity-60">ANTI_GRAVITY MATCH SYSTEM 1.0</p>
         </div>
         <div className="flex gap-3">
            <button onClick={toggleTheme} className="p-3 hud-panel rounded-xl hover:border-cyan-500 transition-all">
               {theme === 'dark' ? <Sun size={18} className="text-cyan-400" /> : <Moon size={18} />}
            </button>
            {user && (
                <button onClick={logout} className="p-3 hud-panel rounded-xl text-pink-500 hover:bg-pink-500/10 transition-all">
                   <LogOut size={18} />
                </button>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col p-8 overflow-y-auto no-scrollbar space-y-8 z-20">
        <AnimatePresence mode="wait">
          {user ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="hud-panel p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 rounded-xl bg-cyan-500/10 flex items-center justify-center text-4xl border border-cyan-500/20 relative z-10 neon-border">
                        {user.avatar}
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-sync text-cyan-500 mb-1">UNIT_ID</p>
                        <h2 className="text-2xl font-cyber text-white neon-text">{user.username}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="hud-panel p-4 rounded-xl text-center">
                        <p className="text-[7px] font-sync text-gray-500 mb-1">WIN_RATE</p>
                        <p className="text-xl font-cyber text-emerald-400">
                            {user?.stats?.matchesPlayed 
                                ? ((user.stats.wins / user.stats.matchesPlayed) * 100).toFixed(0) 
                                : '0'}%
                        </p>
                    </div>
                    <div className="hud-panel p-4 rounded-xl text-center">
                        <p className="text-[7px] font-sync text-gray-500 mb-1">SCORE_MAX</p>
                        <p className="text-xl font-cyber text-cyan-400">{user.stats?.highestScore || 0}</p>
                    </div>
                    <div className="hud-panel p-4 rounded-xl text-center">
                        <p className="text-[7px] font-sync text-gray-500 mb-1">RANK_LVL</p>
                        <p className="text-xl font-cyber text-purple-400">0{user.stats?.wins || 0}</p>
                    </div>
                </div>
              </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                <div className="inline-flex p-8 rounded-full hud-panel mb-2">
                    <Cpu size={56} className="text-cyan-500/30 animate-pulse" />
                </div>
                <h2 className="text-xl font-cyber text-cyan-500">INITIALIZE IDENTITY</h2>
                <div className="relative">
                    <input 
                    type="text" 
                    placeholder="USERNAME_STRING"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                    className="w-full hud-panel rounded-xl p-6 outline-none focus:border-cyan-500 transition-all text-center font-cyber text-xl tracking-widest bg-black/40"
                    />
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
            {/* 🛠️ MATCH CONFIG */}
            <div className="hud-panel p-6 rounded-2xl space-y-5 border-t-2 border-cyan-500/20">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Globe size={12} className="text-cyan-500" />
                        <p className="text-[8px] font-sync text-cyan-500"> PROTOCOL</p>
                    </div>
                    <div className="flex gap-2">
                        {(['SINGLE_WICKET', 'OVERS', 'TEST'] as const).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMatchMode(m)}
                                className={`text-[9px] font-cyber px-4 py-2 rounded-lg border transition-all ${matchMode === m ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black/40 text-cyan-700 border-white/5 hover:border-cyan-500/30'}`}
                            >
                                {m.split('_')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                {matchMode === 'OVERS' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center pt-3 border-t border-white/5">
                        <p className="text-[8px] font-sync text-gray-500">LIMIT_CYCLES</p>
                        <div className="flex gap-2">
                            {[2, 5, 10].map(ov => (
                                <button key={ov} onClick={() => setOversConfig(ov)} className={`w-10 h-10 rounded-lg font-cyber text-xs transition-all border ${oversConfig === ov ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-500 border-white/10'}`}>{ov}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 🕹️ ACTIONS */}
            <div className="grid gap-4">
                <button onClick={() => handleStartGame('create')} className="btn-cyber btn-primary-neon group py-6">
                    <Zap size={24} />
                    <span className="font-cyber text-2xl">CREATE REALM</span>
                    <ChevronRight size={20} className="ml-auto group-hover:translate-x-2 transition-transform" />
                </button>

                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="ENTER REALM_TOKEN"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="w-full hud-panel rounded-xl p-6 pr-40 outline-none focus:border-pink-500 transition-all font-cyber text-lg bg-black/40"
                    />
                    <button onClick={() => handleStartGame('join')} className="absolute right-3 top-3 bottom-3 bg-pink-600 hover:bg-pink-500 text-white px-8 rounded-lg text-[10px] font-cyber transition-all">CONNECT</button>
                </div>
            </div>

            {/* 🤖 AI CORE */}
            <div className="hud-panel p-6 rounded-2xl space-y-5 border-t-2 border-purple-500/20">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <Cpu size={12} className="text-purple-500" />
                      <p className="text-[8px] font-sync text-purple-500">NEURAL DIFFICULTY</p>
                  </div>
                  <div className="flex gap-2">
                     {(['BASIC', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((level) => (
                        <button 
                           key={level}
                           onClick={() => setDifficulty(level)}
                           className={`text-[8px] font-cyber px-3 py-1.5 rounded-lg border transition-all ${difficulty === level ? 'bg-purple-600 text-white border-purple-400' : 'bg-black/40 text-purple-800 border-white/5 hover:border-purple-500/30'}`}
                        >
                           {level}
                        </button>
                     ))}
                  </div>
               </div>
               <button onClick={() => handleStartGame('bot')} className="w-full btn-cyber hover:bg-purple-500/10 group transition-all">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-cyber text-xl leading-none">AI SIMULATION</p>
                    <p className="text-[7px] font-sync text-gray-600">OFFLINE TRAINING MODULE</p>
                  </div>
                  <Play size={20} className="ml-auto text-purple-500" />
               </button>
            </div>
        </div>
      </div>

      {/* 🧭 NAV */}
      <div className="p-8 pt-0 grid grid-cols-2 gap-4 z-20">
         <button onClick={() => setShowHowTo(true)} className="py-4 btn-cyber text-[10px] font-cyber opacity-60 hover:opacity-100">
            <Info size={14} /> MANUAL
         </button>
         <button onClick={() => router.push('/demo')} className="py-4 btn-cyber text-[10px] font-cyber text-cyan-400 border-cyan-500/20">
            <Play size={14} /> PRACTICE
         </button>
      </div>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
    </div>
  );
}
