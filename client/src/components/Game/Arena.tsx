"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, ChevronRight, Share2, Info, Activity, Globe, Wifi } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
import CountUp from '@/components/UI/CountUp';
import confetti from 'canvas-confetti';
import { Howl } from 'howler';

const BUTTONS = [1, 2, 3, 4, 5, 6];

export default function Arena({ room: initialRoom, username, isDemo, onExit }) {
  const socket = useSocket();
  const { user } = useStore();
  
  const [room, setRoom] = useState(initialRoom);
  const [gameState, setGameState] = useState(initialRoom?.gameState || (isDemo ? 'PLAYING' : 'LOBBY'));
  const [myMove, setMyMove] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [reaction, setReaction] = useState<any>(null);
  const [timer, setTimer] = useState(10);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tossChoice, setTossChoice] = useState<string | null>(null);

  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    win: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.4 })
  };

  useEffect(() => {
    if (!socket || isDemo) return;
    socket.on('playerJoined', (r) => setRoom(r));
    socket.on('tossChoiceLocked', ({ choice }) => setTossChoice(choice));
    socket.on('tossResult', (res) => { setLastResult({ type: 'TOSS', ...res }); setGameState('ROLE_SELECT'); });
    socket.on('gameStarted', (r) => { setRoom(r); setGameState('PLAYING'); setLastResult(null); });
    socket.on('updateScore', ({ room, lastResult }) => { setRoom(room); setLastResult(lastResult); setMyMove(null); sounds.bat.play(); setTimer(10); });
    socket.on('playerOut', ({ room }) => { setRoom(room); setLastResult({ type: 'OUT' }); setMyMove(null); sounds.wicket.play(); setTimer(10); });
    socket.on('matchResult', (r) => { setRoom(r); setGameState('FINISHED'); if (r.winner === socket.id) { confetti({ particleCount: 200, spread: 90 }); sounds.win.play(); } });
    socket.on('messageReceived', (msg) => setMessages(prev => [...prev, msg]));

    return () => {
        socket.off('playerJoined');
        socket.off('tossChoiceLocked');
        socket.off('tossResult');
        socket.off('gameStarted');
        socket.off('updateScore');
        socket.off('playerOut');
        socket.off('matchResult');
        socket.off('messageReceived');
    };
  }, [socket, isDemo]);

  useEffect(() => {
    if (gameState === 'PLAYING' && myMove === null) {
        const interval = setInterval(() => { setTimer(prev => prev <= 1 ? 0 : prev - 1); }, 1000);
        return () => clearInterval(interval);
    }
  }, [gameState, myMove]);

  const handleMove = (val: number) => {
    if (myMove !== null) return;
    setMyMove(val);
    if (gameState === 'TOSS') socket.emit('sendTossNumber', { roomId: room.roomId, number: val });
    else if (gameState === 'PLAYING') socket.emit('sendNumber', { roomId: room.roomId, number: val });
  };

  const handleTossChoice = (choice: string) => {
      socket.emit('tossChoice', { roomId: room.roomId, choice });
  };

  const handleRoleSelect = (role: string) => {
      socket.emit('selectRole', { roomId: room.roomId, role });
  };

  const sendChat = () => {
      if (!chatMsg.trim()) return;
      socket.emit('sendMessage', { roomId: room.roomId, message: chatMsg, username });
      setChatMsg("");
  };

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: 'Player 2', score: 0, role: 'bowler' };

  return (
    <div className="game-container">
      {/* 📡 BROADCAST TOP BAR */}
      <div className="broadcast-strip p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex flex-col">
                <h1 className="text-xl font-heading gold-text italic tracking-wider leading-none">HPL LIVE</h1>
                <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-40">CHAMPIONS LEAGUE v1.0</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black tracking-widest text-emerald-500 uppercase">{isDemo ? 'OFFLINE' : 'STABLE'}</span>
            </div>
            <button onClick={() => setChatOpen(true)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all relative">
                <MessageSquare size={18} />
                {messages.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
        </div>
      </div>

      {/* 🏟️ MAIN FIELD AREA */}
      <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
        {/* Pitch Pattern Background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 bg-white/[0.02] -rotate-12 blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="relative group">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="w-48 h-48 rounded-full border-2 border-dashed border-white/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-3xl">
                            <Users size={48} className="text-white/20 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-heading italic gold-text">MATCHMAKING...</h2>
                    <div className="px-6 py-4 rounded-[2rem] glass-panel space-y-2">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">Share Room ID</p>
                        <p className="text-3xl font-heading tracking-[0.3em]">{room?.roomId}</p>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                {/* 📊 MINI SCORE SUMMARY */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="glass-panel p-4 rounded-3xl space-y-1 border-l-4 border-yellow-500">
                        <p className="text-[8px] font-black uppercase text-yellow-500 tracking-widest">{me.role}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-heading italic leading-none"><CountUp value={me.score} /></span>
                            <span className="text-[10px] font-bold text-gray-600">RUNS</span>
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-3xl space-y-1 text-right border-r-4 border-blue-500">
                        <p className="text-[8px] font-black uppercase text-blue-500 tracking-widest">{opp.role}</p>
                        <div className="flex items-baseline justify-end gap-2">
                            <span className="text-4xl font-heading italic leading-none"><CountUp value={opp.score} /></span>
                            <span className="text-[10px] font-bold text-gray-600">RUNS</span>
                        </div>
                    </div>
                </div>

                {room?.target && (
                    <motion.div initial={{ y: -10 }} animate={{ y: 0 }} className="mb-6 bg-gradient-to-r from-blue-600/20 to-transparent border border-white/5 p-4 rounded-2xl flex justify-between items-center px-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg"><Globe size={14} /></div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-blue-400">Target</p>
                                <p className="text-xl font-heading italic leading-none">{room.target}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-bold text-gray-500 uppercase">Requirement</p>
                            <p className="text-xl font-heading italic text-yellow-500 leading-none">{Math.max(0, room.target - me.score)} Runs</p>
                        </div>
                    </motion.div>
                )}

                {/* 🕹️ CENTER ACTION ZONE */}
                <div className="flex-1 glass-panel rounded-[3rem] relative flex flex-col items-center justify-center p-8 shimmer">
                    <AnimatePresence mode="wait">
                        {myMove ? (
                            <motion.div key="move" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                <p className="text-[8px] font-black text-gray-600 mb-4 tracking-[0.4em] uppercase">Selection Locked</p>
                                <div className="text-9xl font-heading italic gold-text leading-none">{myMove}</div>
                            </motion.div>
                        ) : (
                            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center group">
                                <div className="p-6 rounded-full border border-white/5 animate-pulse mb-4">
                                    <Clock size={32} className="text-gray-700" />
                                </div>
                                <h3 className="text-3xl font-heading italic opacity-20 tracking-widest leading-none mb-2">DECIDING...</h3>
                                <div className="flex items-center gap-2 justify-center">
                                    <span className="text-yellow-500 font-black italic text-xl">{timer}</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase">Sec Left</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* POP RESULT */}
                    <AnimatePresence>
                        {lastResult && !myMove && (
                             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 rounded-[3rem] backdrop-blur-md">
                                <div className="space-y-6 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500">BALL COMPLETE</p>
                                    <div className="flex items-center gap-10">
                                        <div>
                                            <p className="text-6xl font-heading italic">{lastResult.batMove}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase">Bat</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20" />
                                        <div>
                                            <p className="text-6xl font-heading italic text-red-500">{lastResult.bowlMove}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase">Bowl</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-xs font-black italic text-emerald-500 uppercase tracking-widest">
                                            {lastResult.batMove === lastResult.bowlMove ? 'OUT!' : `+${lastResult.batMove} Runs Added`}
                                        </p>
                                    </div>
                                </div>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 🔢 CONTROLLER PAD */}
                <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-4">
                        {BUTTONS.map(n => (
                            <button 
                                key={n} 
                                disabled={myMove !== null} 
                                onClick={() => handleMove(n)} 
                                className={`h-20 rounded-3xl btn-neon flex items-center justify-center text-4xl font-heading italic transition-all
                                    ${myMove === n 
                                        ? 'bg-yellow-500 text-black border-yellow-800' 
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'FINISHED' && (
             <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10 text-center">
                <div className="p-10 rounded-[4rem] bg-yellow-500/10 border border-yellow-500/20 shadow-4xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
                    <Trophy size={150} className="text-yellow-500 relative z-10" />
                </div>
                <div>
                   <h2 className="text-6xl font-heading italic gold-text tracking-tighter uppercase leading-none mb-2">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "VICTORY!" : "DEFEAT"}
                   </h2>
                   <p className="text-gray-500 font-bold uppercase tracking-[0.5em] text-[10px]">World Championship Series</p>
                </div>
                
                <div className="w-full space-y-3">
                    <button onClick={onExit} className="w-full btn-primary py-6 rounded-[2.5rem] text-2xl shadow-2xl transition-all hover:scale-[1.02]">PLAY NEW MATCH</button>
                    <button onClick={onExit} className="w-full bg-white/5 py-4 rounded-[2rem] font-heading text-lg text-gray-500">EXIT TO LOBBY</button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 📟 MATCH TICKER */}
      {gameState === 'PLAYING' && (
          <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex items-center gap-4 overflow-x-auto no-scrollbar">
              <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest flex-shrink-0">TICKER //</span>
              <div className="flex gap-2">
                  {room?.history?.slice(-10).reverse().map((h, i) => (
                      <div key={i} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-heading italic text-sm ${h.batMove === h.bowlMove ? 'bg-red-500' : 'bg-emerald-500'}`}>
                          {h.batMove === h.bowlMove ? 'W' : h.batMove}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 💭 CHAT OVERLAY */}
      <AnimatePresence>
          {chatOpen && (
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed inset-0 z-[100] bg-[var(--background)] p-8 flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <MessageSquare className="text-yellow-500" size={24} />
                        <h3 className="text-2xl font-heading italic gold-text tracking-widest uppercase">MATCH SHOUTS</h3>
                      </div>
                      <button onClick={() => setChatOpen(false)} className="p-3 bg-white/5 rounded-full"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar mb-6">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-black text-gray-700 mb-2 uppercase tracking-widest">{m.username}</span>
                              <div className={`px-6 py-4 rounded-[2rem] max-w-[85%] font-bold text-sm leading-relaxed ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'bg-yellow-500 text-black rounded-tr-none' : 'bg-[#1A1F26] rounded-tl-none border border-white/5'}`}>
                                  {m.message}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} className="flex-1 bg-white/5 p-5 rounded-[2rem] outline-none border border-white/5 font-bold" placeholder="Shout your move..." />
                      <button onClick={sendChat} className="p-5 bg-yellow-500 text-black rounded-full shadow-2xl active:scale-95 transition-all"><Send size={24} /></button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
