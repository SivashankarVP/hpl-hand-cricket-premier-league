"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Info, Hash, ChevronRight, Moon, Sun, User as UserIcon, LogOut, Medal, Zap, ShieldCheck, Gamepad2, Settings2, Activity } from 'lucide-react';
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
      finalUsername = `CHAMP_${Math.floor(Math.random() * 9000) + 1000}`;
      setUsernameInput(finalUsername);
    }

    if (!user || user.username !== finalUsername) {
        setUser({ username: finalUsername, avatar: '🏏' });
    }

    if (mode === 'create') {
        socket.emit('createRoom', { 
            username: finalUsername, 
            matchMode, 
            maxOvers: matchMode === 'OVERS' ? oversConfig : 0, 
            maxWickets: matchMode === 'TEST' ? 10 : 1 
        });
    } else if (mode === 'join') {
        if (!roomCode) return setError("Enter a room code!");
        router.push(`/room/${roomCode.toUpperCase()}`);
    } else if (mode === 'bot') {
        socket.emit('createBotRoom', { 
            username: finalUsername, 
            difficulty,
            matchMode,
            maxOvers: matchMode === 'OVERS' ? oversConfig : 0,
            maxWickets: matchMode === 'TEST' ? 10 : 1
        });
    }
  };

  return (
    <div className="game-container shadow-2xl">
      <div className="scanline" />
      
      {/* 🔝 PRO HEADER */}
      <div className="p-8 pb-4 flex justify-between items-center z-20">
         <div className="flex flex-col">
            <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-6xl font-heading gold-text italic tracking-tighter leading-none mb-1"
            >
                HPL
            </motion.h1>
            <div className="flex items-center gap-2">
                <div className="live-indicator"><div className="live-dot" /> LIVE</div>
                <p className="text-[8px] font-sync text-gray-500 uppercase">Pro League v2.0</p>
            </div>
         </div>
         <div className="flex gap-3">
            <button onClick={toggleTheme} className="p-3 glass-card rounded-2xl hover:bg-white/10 transition-all">
               {theme === 'dark' ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
            </button>
            {user && (
                <button onClick={logout} className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500/20 transition-all">
                   <LogOut size={18} />
                </button>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col p-8 overflow-y-auto no-scrollbar space-y-8 z-20">
        <AnimatePresence mode="wait">
          {user ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="glass-card p-6 rounded-[2rem] flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-surface-lighter flex items-center justify-center text-5xl border border-yellow-500/20 shadow-xl relative z-10">
                        {user.avatar}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-yellow-500 rounded-lg shadow-lg"><Medal size={14} className="text-black" /></div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-sync text-gray-500 mb-1">PRO ATHLETE</p>
                        <h2 className="text-3xl font-black italic tracking-tight gold-text">{user.username}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-inset p-4 rounded-3xl text-center backdrop-blur-sm">
                        <p className="text-[9px] font-bold text-gray-600 uppercase mb-1">Victory</p>
                        <p className="text-2xl font-heading text-emerald-500 leading-none">{user.stats?.wins || 0}</p>
                    </div>
                    <div className="glass-inset p-4 rounded-3xl text-center backdrop-blur-sm">
                        <p className="text-[9px] font-bold text-gray-600 uppercase mb-1">Record</p>
                        <p className="text-2xl font-heading text-yellow-500 leading-none">{user.stats?.highestScore || 0}</p>
                    </div>
                    <div className="glass-inset p-4 rounded-3xl text-center backdrop-blur-sm">
                        <p className="text-[9px] font-bold text-gray-600 uppercase mb-1">Rank</p>
                        <p className="text-2xl font-heading text-blue-500 leading-none">#{user.stats?.rank || '---'}</p>
                    </div>
                </div>
              </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                <div className="inline-flex p-8 rounded-[3rem] glass-card mb-2 shadow-2xl relative">
                    <div className="absolute inset-0 bg-yellow-500/5 blur-xl animate-pulse" />
                    <UserIcon size={56} className="text-yellow-500/20 relative z-10" />
                </div>
                <h2 className="text-2xl font-heading italic tracking-[0.2em] text-gray-500">ENTER THE ARENA</h2>
                <div className="relative">
                    <input 
                    type="text" 
                    placeholder="CHALLENGER_NAME"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                    className="w-full glass-inset rounded-[2rem] p-6 outline-none focus:border-yellow-500/50 transition-all text-center font-heading text-2xl tracking-[0.3em] italic border-b-4 border-black"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20"><Zap size={20} /></div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
            {/* 🎮 MODE SELECTOR */}
            <div className="glass-card p-6 rounded-[2.5rem] space-y-4 border-l-4 border-emerald-500">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <Settings2 size={12} className="text-gray-500" />
                        <p className="text-[10px] font-sync text-gray-500">FORMAT</p>
                    </div>
                    <div className="flex gap-2">
                        {(['SINGLE_WICKET', 'OVERS', 'TEST'] as const).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMatchMode(m)}
                                className={`text-[9px] font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${matchMode === m ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white/5 text-gray-500 border-white/5 hover:border-emerald-500/30'}`}
                            >
                                {m.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {matchMode === 'OVERS' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex justify-between items-center px-1 pt-3 border-t border-white/10 overflow-hidden">
                        <p className="text-[10px] font-bold text-gray-600 uppercase">OVERS LIMIT</p>
                        <div className="flex gap-2">
                            {[2, 5, 10].map(ov => (
                                <button key={ov} onClick={() => setOversConfig(ov)} className={`w-10 h-10 rounded-xl font-heading text-sm transition-all border-2 ${oversConfig === ov ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-500 border-white/10'}`}>{ov}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 🚀 ACTION BUTTONS */}
            <div className="grid gap-4">
                <button onClick={() => handleStartGame('create')} className="btn-action btn-primary group active:scale-95">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-black">
                            <Zap size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-heading italic text-2xl leading-none">START MATCH</p>
                            <p className="text-[8px] font-sync text-black/50">CREATE SECURE SERVER</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="ml-auto group-hover:translate-x-2 transition-transform" />
                </button>

                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="ENTER MATCH CODE"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="w-full glass-inset rounded-[2rem] p-6 pr-40 outline-none focus:border-cyan-500/50 transition-all font-heading text-xl text-center italic tracking-[0.3em]"
                    />
                    <button onClick={() => handleStartGame('join')} className="absolute right-3 top-3 bottom-3 bg-cyan-500 hover:bg-cyan-400 text-black px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">JOIN</button>
                </div>
            </div>

            {/* 🤖 AI CHALLENGE */}
            <div className="glass-card p-6 rounded-[2.5rem] space-y-5 border-l-4 border-purple-500">
               <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                      <Activity size={12} className="text-gray-500" />
                      <p className="text-[10px] font-sync text-gray-500">AI DIFFICULTY</p>
                  </div>
                  <div className="flex gap-2">
                     {(['BASIC', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((level) => (
                        <button 
                           key={level}
                           onClick={() => setDifficulty(level)}
                           className={`text-[9px] font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${difficulty === level ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:border-purple-500/30'}`}
                        >
                           {level}
                        </button>
                     ))}
                  </div>
               </div>
               <button onClick={() => handleStartGame('bot')} className="w-full bg-surface-lighter hover:bg-white/10 p-5 rounded-3xl flex items-center justify-between group transition-all border border-white/5 border-b-4 border-b-black overflow-hidden relative">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500 opacity-30" />
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                        <Gamepad2 size={24} />
                     </div>
                     <div className="text-left">
                        <p className="font-heading italic text-2xl leading-none">VS ENGINE</p>
                        <p className="text-[8px] font-sync text-gray-600">OFFLINE PRACTICE MODE</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black italic text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">CHALLENGE</span>
                      <Play size={20} className="text-purple-500" />
                  </div>
               </button>
            </div>
        </div>
      </div>

      <div className="p-8 pt-0 grid grid-cols-2 gap-4 z-20">
         <button onClick={() => setShowHowTo(true)} className="py-4 glass-card rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-yellow-500/50 transition-all border-b-4 border-b-black active:translate-y-1">
            <Info size={14} /> Guide
         </button>
         <button onClick={() => router.push('/demo')} className="py-4 glass-card rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-emerald-500/50 transition-all border-b-4 border-b-black active:translate-y-1">
            <Play size={14} /> Practice AI
         </button>
      </div>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
    </div>
  );
}
