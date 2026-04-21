"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Info, Hash, ChevronRight, Moon, Sun, User as UserIcon, LogOut, Medal, Zap } from 'lucide-react';
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
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) setRoomCode(roomParam.toUpperCase());

    if (!socket) return;
    socket.on('roomCreated', (room) => router.push(`/room/${room.roomId}`));
    socket.on('error', (msg) => { setError(msg); setTimeout(() => setError(""), 3000); });
    return () => { socket.off('roomCreated'); socket.off('error'); };
  }, [socket, searchParams]);

  const handleStartGame = (mode: 'create' | 'join' | 'demo') => {
    let finalUsername = usernameInput.trim();
    
    // Auto-generate name if none provided
    if (!finalUsername) {
      finalUsername = `CHAMP_${Math.floor(Math.random() * 9000) + 1000}`;
      setUsernameInput(finalUsername);
    }

    // Save user to store
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
    <div className="game-container shimmer">
      {/* 🔝 HEADER */}
      <div className="p-8 pb-0 flex justify-between items-start">
         <div className="flex flex-col">
            <h1 className="text-5xl font-heading gold-text italic tracking-tighter leading-none mb-1">HPL</h1>
            <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full inline-flex">
                <p className="text-[7px] font-black uppercase tracking-[0.4em] text-yellow-500">Official League v1.0</p>
            </div>
         </div>
         <div className="flex gap-3">
            <button onClick={toggleTheme} className="p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all">
               {theme === 'dark' ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} />}
            </button>
            {user && (
                <button onClick={logout} className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 hover:bg-red-500/20 transition-all">
                   <LogOut size={20} />
                </button>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col p-8 justify-center space-y-10">
        <AnimatePresence mode="wait">
          {user ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-yellow-500/20 to-transparent flex items-center justify-center text-5xl border border-white/5 shadow-2xl relative">
                        {user.avatar}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-yellow-500 rounded-lg"><Medal size={14} className="text-black" /></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Champion Profile</p>
                        <h2 className="text-3xl font-black italic tracking-tight italic gold-text">{user.username}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-panel p-4 rounded-3xl text-center">
                        <p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Wins</p>
                        <p className="text-2xl font-heading text-emerald-500 leading-none">{user.stats?.wins || 0}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-3xl text-center">
                        <p className="text-[8px] font-bold text-gray-600 uppercase mb-1">High</p>
                        <p className="text-2xl font-heading text-yellow-500 leading-none">{user.stats?.highestScore || 0}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-3xl text-center">
                        <p className="text-[8px] font-bold text-gray-600 uppercase mb-1">XP</p>
                        <p className="text-2xl font-heading text-blue-500 leading-none">{user.stats?.matchesPlayed || 0}</p>
                    </div>
                </div>
              </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                <div className="inline-flex p-6 rounded-[2.5rem] bg-white/5 border border-white/5 mb-2 shadow-3xl">
                    <UserIcon size={48} className="text-yellow-500/40" />
                </div>
                <h2 className="text-2xl font-heading italic tracking-widest text-gray-400">CLAIM YOUR TITLE</h2>
                <input 
                  type="text" 
                  placeholder="USERNAME"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-[2rem] p-6 outline-none focus:border-yellow-500/50 transition-all text-center font-heading text-2xl tracking-[0.2em] italic border-b-4 border-b-black"
                />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
            <div className="glass-panel p-6 rounded-[2.5rem] space-y-4 border border-white/5">
                <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Match Format</p>
                    <div className="flex gap-2">
                        {(['SINGLE_WICKET', 'OVERS', 'TEST'] as const).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMatchMode(m)}
                                className={`text-[8px] font-black px-3 py-1 rounded-full border transition-all ${matchMode === m ? 'bg-emerald-500 text-black border-emerald-600' : 'bg-white/5 text-gray-500 border-white/5'}`}
                            >
                                {m.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {matchMode === 'OVERS' && (
                    <div className="flex justify-between items-center px-2 pt-2 border-t border-white/5">
                        <p className="text-[9px] font-bold text-gray-600 uppercase">Overs Count</p>
                        <div className="flex gap-2">
                            {[2, 5, 10].map(ov => (
                                <button key={ov} onClick={() => setOversConfig(ov)} className={`w-8 h-8 rounded-lg font-heading text-xs transition-all ${oversConfig === ov ? 'bg-white text-black' : 'bg-white/5 text-gray-500'}`}>{ov}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button onClick={() => handleStartGame('create')} className="w-full btn-primary p-6 rounded-[2.5rem] flex items-center justify-between group active:translate-y-1 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-black">
                    <Zap size={24} />
                </div>
                <div className="text-left">
                    <p className="font-heading italic text-2xl leading-none">START MATCH</p>
                    <p className="text-[8px] font-black text-black/40 tracking-widest uppercase">Create unique room</p>
                </div>
              </div>
              <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>

            <div className="relative">
              <input 
                type="text" 
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-[#111] border border-white/5 rounded-[2.5rem] p-6 pr-36 outline-none focus:border-emerald-500/50 transition-all font-heading text-xl text-center italic tracking-widest"
              />
              <button onClick={() => handleStartGame('join')} className="absolute right-3 top-3 bottom-3 bg-white/10 hover:bg-white/20 text-white px-8 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all">JOIN</button>
            </div>

            <div className="glass-panel p-6 rounded-[2.5rem] space-y-4">
               <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Practice vs AI</p>
                  <div className="flex gap-2">
                     {(['BASIC', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((level) => (
                        <button 
                           key={level}
                           onClick={() => setDifficulty(level)}
                           className={`text-[8px] font-black px-3 py-1 rounded-full transition-all border ${difficulty === level ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-white/5 text-gray-400 border-white/5'}`}
                        >
                           {level}
                        </button>
                     ))}
                  </div>
               </div>
               <button onClick={() => handleStartGame('bot')} className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex items-center justify-between group transition-all border border-white/5 border-b-2 border-b-white/10">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                        <Trophy size={20} />
                     </div>
                     <div className="text-left">
                        <p className="font-heading italic text-xl leading-none">AI CHALLENGE</p>
                        <p className="text-[7px] font-black text-gray-600 tracking-widest uppercase">Ranked Solo Play</p>
                     </div>
                  </div>
                  <Play size={18} className="text-purple-500" />
               </button>
            </div>
        </div>
      </div>

      {/* 🧭 FOOTER */}
      <div className="p-8 flex justify-center gap-4">
         <button onClick={() => router.push('/demo')} className="flex-1 py-4 glass-panel rounded-[1.5rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"><Play size={14} /> Practice AI</button>
         <button onClick={() => setShowHowTo(true)} className="flex-1 py-4 glass-panel rounded-[1.5rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"><Info size={14} /> Rules Guide</button>
      </div>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
    </div>
  );
}
