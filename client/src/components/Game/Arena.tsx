"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, ChevronRight, Share2, Info } from 'lucide-react';
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

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: 'Player 2', score: 0, role: 'bowler' };

  return (
    <div className="min-h-screen bg-[var(--background)] text-white flex flex-col font-sans overflow-hidden">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-600 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 p-4 flex items-center justify-between border-b border-white/5 glass">
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-2xl transition-all">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="text-center group cursor-pointer">
            <h1 className="text-2xl font-heading gold-text italic tracking-wider leading-none">HPL ARENA</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40 group-hover:opacity-100 transition-opacity">
                Premier League Season 1
            </p>
        </div>
        <button onClick={() => setChatOpen(true)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all relative">
            <MessageSquare size={20} />
            {messages.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#FF3131] rounded-full border-2 border-[#0B0E11]" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-40 h-40 rounded-[3.5rem] border-2 border-dashed border-yellow-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
                            <Users size={48} className="text-yellow-500" />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <h2 className="text-4xl font-heading italic tracking-tighter">WAITING FOR RIVAL</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Searching Match...</span>
                    </div>
                </div>

                <div className="w-full glass p-8 rounded-[3rem] border border-white/5 space-y-4 shadow-3xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center text-gray-500">SHARE MATCH ID</p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 p-5 rounded-3xl border border-white/5 text-3xl font-heading gold-text tracking-[0.3em] text-center">
                            {room?.roomId}
                        </div>
                        <button className="p-5 bg-[var(--primary)] text-black rounded-3xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-yellow-500/10">
                            <Share2 size={24} />
                        </button>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col pb-4">
                {/* FLOATING BROADCAST SCOREBOARD */}
                <div className="mt-4 glass p-6 rounded-[2.5rem] flex justify-between items-end border-b-4 border-yellow-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Trophy size={100} />
                    </div>
                    
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black uppercase text-yellow-500 tracking-[0.2em]">{me.role} INNINGS</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-heading gold-text italic tracking-tighter leading-none">
                                <CountUp value={me.score} duration={400} />
                            </span>
                            <span className="text-sm font-bold text-gray-600">RUNS</span>
                        </div>
                    </div>

                    <div className="text-right space-y-2 relative z-10">
                        <div className={`p-2 px-4 rounded-2xl inline-flex items-center gap-3 transition-colors ${timer < 4 ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
                            <Clock size={16} className={timer < 4 ? 'text-red-500 animate-pulse' : 'text-gray-500'} />
                            <span className={`text-xl font-heading italic ${timer < 4 ? 'text-red-500' : 'text-gray-400'}`}>{timer}S</span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <p className="text-[10px] font-black uppercase text-gray-500">{opp.name} IS {opp.role}</p>
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                    </div>
                </div>

                {/* TARGET MINI CARD */}
                {room?.target && (
                    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 bg-blue-600/10 border border-blue-600/20 rounded-3xl p-4 flex justify-between items-center px-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent" />
                        <div className="flex flex-col">
                            <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest">TARGET SCORE</p>
                            <p className="text-2xl font-heading italic leading-none mt-1">{room.target}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-white/40 uppercase">NEED</p>
                            <p className="text-2xl font-heading italic text-yellow-500 leading-none">{Math.max(0, room.target - me.score)}</p>
                        </div>
                    </motion.div>
                )}

                {/* VISUAL ARENA */}
                <div className="flex-1 mt-6 glass rounded-[3.5rem] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    
                    {/* Arena Overlay Texts */}
                    <div className="absolute top-10 left-10 text-[8px] font-black uppercase tracking-[1em] opacity-10 rotate-90 origin-top-left">HPL PREMIER</div>
                    <div className="absolute bottom-10 right-10 text-[8px] font-black uppercase tracking-[1em] opacity-10 -rotate-90 origin-bottom-right">SEASON ONE</div>

                    <AnimatePresence mode="wait">
                        {myMove ? (
                            <motion.div key="decided" initial={{ scale: 0.5, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} className="flex flex-col items-center gap-6">
                                <div className="p-8 rounded-[3rem] bg-yellow-500 text-black shadow-[0_0_60px_rgba(255,215,0,0.25)] border-4 border-yellow-200/20">
                                    <span className="text-8xl font-heading italic leading-none">{myMove}</span>
                                </div>
                                <div className="px-6 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/5">
                                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] font-heading">Decision Locked</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center group">
                                <div className="space-y-2 opacity-5 relative">
                                    <h3 className="text-9xl font-heading italic tracking-tighter transition-all group-hover:scale-110">HPL</h3>
                                    <p className="text-xs font-black tracking-[1.5em]">ARENA</p>
                                </div>
                                <div className="mt-8">
                                    <div className="flex items-center gap-3 justify-center">
                                         <Zap size={14} className="text-yellow-500 animate-bounce" />
                                         <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] font-heading">IT'S YOUR TURN</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Result Pop Notification */}
                    <AnimatePresence>
                         {lastResult && !myMove && (
                             <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center pointer-events-none">
                                <div className="space-y-4">
                                     <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500">Last Ball Result</p>
                                     <div className="flex items-center gap-12">
                                        <div className="space-y-1">
                                            <p className="text-7xl font-heading italic text-white drop-shadow-2xl">{lastResult.batMove}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase">Bat Selection</p>
                                        </div>
                                        <div className="w-1 h-20 bg-white/10 rounded-full rotate-12" />
                                        <div className="space-y-1">
                                            <p className="text-7xl font-heading italic text-[#FF3131] drop-shadow-2xl">{lastResult.bowlMove}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase">Bowl Selection</p>
                                        </div>
                                     </div>
                                </div>
                             </motion.div>
                         )}
                    </AnimatePresence>
                </div>

                {/* GAME CONTROLS - NEON STYLE */}
                <div className="mt-8 space-y-6">
                    <div className="grid grid-cols-6 gap-3">
                        {BUTTONS.map(n => (
                            <button 
                                key={n} 
                                disabled={myMove !== null} 
                                onClick={() => handleMove(n)} 
                                className={`aspect-square rounded-[1.5rem] flex items-center justify-center text-3xl font-heading italic transition-all border-b-8 shadow-xl 
                                    ${myMove === n 
                                        ? 'bg-yellow-500 text-black border-yellow-800 scale-105 neon-border' 
                                        : 'bg-[#15191E] border-[#07090B] hover:bg-[#1E252C] hover:scale-105 active:translate-y-2 active:border-b-0'
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
             <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12 py-10">
                <div className="relative">
                    <div className="p-12 bg-yellow-500/10 rounded-[4rem] border-2 border-yellow-500/20 shadow-4xl shadow-yellow-500/10">
                        <Trophy size={140} className="text-yellow-500 drop-shadow-[0_0_40px_rgba(255,215,0,0.4)]" />
                    </div>
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -inset-4 bg-yellow-500/5 blur-[40px] rounded-full" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-7xl font-heading italic gold-text tracking-tighter uppercase leading-none neon-text">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "VICTORY!" : "DEFEATED"}
                    </h2>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] font-heading">Match Official Result</p>
                </div>

                <div className="w-full bg-[#111] p-10 rounded-[3rem] border border-white/5 space-y-4 shadow-3xl">
                    <div className="flex justify-between items-center px-4">
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Team {me.name}</p>
                            <p className="text-5xl font-heading italic">{me.score}</p>
                        </div>
                        <div className="text-4xl font-heading italic text-gray-800 opacity-30">VS</div>
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Team {opp.name}</p>
                            <p className="text-5xl font-heading italic text-[#FF3131]">{opp.score}</p>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-3">
                    <button onClick={onExit} className="w-full bg-white text-black py-6 rounded-[2.5rem] font-heading text-2xl italic tracking-tighter active:scale-95 transition-all shadow-2xl">PLAY NEW MATCH</button>
                    <button onClick={onExit} className="w-full bg-white/5 py-5 rounded-[2rem] font-heading text-lg italic text-gray-500 hover:text-white transition-all">BACK TO LOUNGE</button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CHAT OVERLAY DRAWERS */}
      <AnimatePresence>
          {chatOpen && (
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[100] bg-[var(--background)]/95 backdrop-blur-xl p-8 flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="text-blue-500" size={24} />
                        <h3 className="text-2xl font-heading italic gold-text tracking-widest uppercase font-heading">LIVE CHAT</h3>
                      </div>
                      <button onClick={() => setChatOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar mb-6 pr-2">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-black text-gray-600 mb-2 uppercase tracking-widest ml-1">{m.username}</span>
                              <div className={`p-5 rounded-[2rem] max-w-[85%] font-bold text-sm shadow-xl ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'bg-[var(--secondary)] text-white rounded-tr-none' : 'bg-white/5 rounded-tl-none text-gray-200 border border-white/5'}`}>
                                  {m.message}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-3 items-center">
                      <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} className="flex-1 bg-white/5 p-5 rounded-[2rem] outline-none border border-white/5 text-lg font-bold" placeholder="Shout your move..." />
                      <button onClick={sendChat} className="p-5 bg-[var(--secondary)] text-white rounded-full shadow-2xl active:scale-95 transition-all"><Send size={24} /></button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
