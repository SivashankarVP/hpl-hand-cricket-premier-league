"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, ChevronRight, Share2, Info, Activity, Globe, Wifi, Minus } from 'lucide-react';
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
  const [gameState, setGameState] = useState(initialRoom?.gameState || (isDemo ? 'TOSS' : 'LOBBY'));
  const [myMove, setMyMove] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [timer, setTimer] = useState(10);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tossChoice, setTossChoice] = useState<string | null>(null);

  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    win: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.4 }),
    start: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_06253c5cd1.mp3'], volume: 0.5 })
  };

  useEffect(() => {
    if (!socket || isDemo) return;
    socket.on('playerJoined', (r) => setRoom(r));
    socket.on('tossChoiceLocked', ({ choice }) => setTossChoice(choice));
    socket.on('tossResult', (res) => { setLastResult({ type: 'TOSS', ...res }); setGameState('ROLE_SELECT'); });
    socket.on('gameStarted', (r) => { setRoom(r); setGameState('PLAYING'); setLastResult(null); });
    socket.on('updateScore', ({ room, lastResult }) => { setRoom(room); setLastResult(lastResult); setMyMove(null); sounds.bat.play(); setTimer(10); });
    socket.on('playerOut', ({ room, lastResult }) => { 
        setRoom(room); 
        if (lastResult) setLastResult({ type: 'OUT', ...lastResult });
        else setLastResult({ type: 'OUT' });
        setMyMove(null); 
        sounds.wicket.play(); 
        setTimer(10); 
    });
    socket.on('matchResult', ({ room, lastResult }) => { 
        setRoom(room); 
        if (lastResult) setLastResult(lastResult);
        setMyMove(null);
        setTimeout(() => {
            setGameState('FINISHED'); 
            if (room.winner === (isDemo ? 'me' : socket?.id)) { 
                confetti({ particleCount: 200, spread: 90 }); 
                sounds.win.play(); 
            }
        }, 3000); // 3 second delay to see the final ball
    });
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
    if (room?.gameState && room.gameState !== gameState) {
        if (gameState === 'LOBBY' && room.gameState === 'TOSS') {
             sounds.start.play();
             confetti({ particleCount: 50, spread: 60, colors: ['#fbbf24', '#ffffff'] });
        }
        setGameState(room.gameState);
    }
  }, [room?.gameState]);

  useEffect(() => {
    if (gameState === 'PLAYING' && myMove === null) {
        const interval = setInterval(() => { setTimer(prev => prev <= 1 ? 0 : prev - 1); }, 1000);
        return () => clearInterval(interval);
    }
  }, [gameState, myMove]);

  const resolveDemoMove = (playerVal: number) => {
      const botVal = Math.floor(Math.random() * 6) + 1;
      const isOut = playerVal === botVal;
      
      const newHistory = [...(room?.history || []), { 
          batsman: me.role === 'batsman' ? 'ME' : 'BOT',
          bowler: me.role === 'bowler' ? 'ME' : 'BOT',
          batMove: me.role === 'batsman' ? playerVal : botVal,
          bowlMove: me.role === 'bowler' ? playerVal : botVal
      }];

      let updatedMe = { ...me };
      let updatedOpp = { ...opp };
      let nextGameState = gameState;
      let nextInnings = room?.innings || 1;
      let nextTarget = room?.target || null;

      if (isOut) {
          sounds.wicket.play();
          setLastResult({ type: 'OUT', batMove: me.role === 'batsman' ? playerVal : botVal, bowlMove: me.role === 'bowler' ? playerVal : botVal });
          
          if (nextInnings === 1) {
              nextInnings = 2;
              nextTarget = (me.role === 'batsman' ? updatedMe.score : updatedOpp.score) + 1;
              updatedMe.role = updatedMe.role === 'batsman' ? 'bowler' : 'batsman';
              updatedOpp.role = updatedOpp.role === 'batsman' ? 'bowler' : 'batsman';
          } else {
              nextGameState = 'FINISHED';
          }
      } else {
          sounds.bat.play();
          if (me.role === 'batsman') updatedMe.score += playerVal;
          else updatedOpp.score += botVal;
          
          setLastResult({ batMove: me.role === 'batsman' ? playerVal : botVal, bowlMove: me.role === 'bowler' ? playerVal : botVal });

          if (nextInnings === 2 && ((me.role === 'batsman' && updatedMe.score >= nextTarget) || (opp.role === 'batsman' && updatedOpp.score >= nextTarget))) {
              nextGameState = 'FINISHED';
          }
      }

      setRoom({
          ...room,
          players: [updatedMe, updatedOpp],
          history: newHistory,
          innings: nextInnings,
          target: nextTarget,
          winner: nextGameState === 'FINISHED' ? (updatedMe.score >= (nextTarget || 0) && me.role === 'batsman' ? 'me' : 'opp') : null
      });
      setGameState(nextGameState);
      setMyMove(null);
  };

  const handleMove = (val: number) => {
    if (myMove !== null) return;
    if (isDemo) {
        setMyMove(val);
        setTimeout(() => resolveDemoMove(val), 1000);
        return;
    }
    setMyMove(val);
    if (gameState === 'TOSS') socket.emit('sendTossNumber', { roomId: room.roomId, number: val });
    else if (gameState === 'PLAYING') socket.emit('sendNumber', { roomId: room.roomId, number: val });
  };

  const handleTossChoice = (choice: string) => {
      if (isDemo) {
          setTossChoice(choice);
          return;
      }
      socket.emit('tossChoice', { roomId: room.roomId, choice });
  };

  const handleRoleSelect = (role: string) => {
      if (isDemo) {
          setRoom({
              ...room,
              players: [
                  { id: 'me', name: username, score: 0, role: role === 'batting' ? 'batsman' : 'bowler' },
                  { id: 'bot', name: 'AI BOT', score: 0, role: role === 'batting' ? 'bowler' : 'batsman' }
              ]
          });
          setGameState('PLAYING');
          return;
      }
      socket.emit('selectRole', { roomId: room.roomId, role });
  };

  const sendChat = () => {
      if (!chatMsg.trim()) return;
      socket.emit('sendMessage', { roomId: room.roomId, message: chatMsg, username });
      setChatMsg("");
  };

  const copyRoomLink = () => {
      const link = `${window.location.origin}/room/${room?.roomId}`;
      navigator.clipboard.writeText(link);
  };

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: 'Player 2', score: 0, role: 'bowler' };

  return (
    <div className="game-container">
      <div className="scanline" />
      
      {/* 📡 BROADCAST TOP BAR */}
      <div className="broadcast-header z-50">
        <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex flex-col">
                <h1 className="text-3xl font-heading gold-text italic tracking-wider leading-none">HPL LIVE</h1>
                <p className="text-[7px] font-sync opacity-40 uppercase">CHAMPIONS LEAGUE</p>
            </div>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
            <div className="live-indicator"><div className="live-dot" /> LIVE</div>
            <button onClick={() => setChatOpen(true)} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all relative">
                <MessageSquare size={16} />
                {messages.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-surface shadow-lg" />}
            </button>
        </div>
      </div>

      {/* 🏟️ MAIN FIELD AREA */}
      <div className="flex-1 p-6 flex flex-col relative overflow-hidden z-20">
        <div className="pitch-bg" />

        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-56 h-56 rounded-full border-2 border-dashed border-yellow-500/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full glass-card flex items-center justify-center border-2 border-yellow-500/20 shadow-3xl">
                            <Users size={56} className="text-yellow-500/20 animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="text-center space-y-6">
                    <h2 className="text-4xl font-heading italic gold-text">MATCHMAKING...</h2>
                    <div className="px-8 py-6 rounded-[2.5rem] glass-card space-y-4 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-yellow-500/30" />
                        <div>
                            <p className="text-[10px] font-sync text-gray-500 uppercase mb-2">Match Token</p>
                            <p className="text-5xl font-heading tracking-[0.2em] gold-text">{room?.roomId}</p>
                        </div>
                        <button 
                            onClick={copyRoomLink}
                            className="w-full py-4 bg-yellow-500 text-black rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-yellow-500/20"
                        >
                            <Share2 size={16} /> Invite Challenger
                        </button>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'TOSS' && (
             <motion.div key="toss" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="w-48 h-48 rounded-[3rem] glass-card flex items-center justify-center border-4 border-yellow-500/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent group-hover:rotate-180 transition-transform duration-1000" />
                    <Sparkles size={80} className="text-yellow-500 relative z-10 animate-bounce" />
                </div>
                <div className="text-center space-y-6">
                    <h2 className="text-5xl font-heading italic gold-text tracking-tight">THE TOSS</h2>
                    {!tossChoice ? (
                        <div className="space-y-4">
                            <p className="text-gray-500 font-sync text-[8px] uppercase">Select your prediction</p>
                            <div className="flex gap-4">
                                <button onClick={() => handleTossChoice('odd')} className="px-12 py-6 glass-card rounded-3xl font-heading text-3xl hover:bg-yellow-500 hover:text-black transition-all border-b-4 border-black active:translate-y-1">ODD</button>
                                <button onClick={() => handleTossChoice('even')} className="px-12 py-6 glass-card rounded-3xl font-heading text-3xl hover:bg-yellow-500 hover:text-black transition-all border-b-4 border-black active:translate-y-1">EVEN</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Called {tossChoice.toUpperCase()}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[1,2,3,4,5,6].map(n => (
                                    <button key={n} onClick={() => handleMove(n)} className="num-btn">{n}</button>
                                ))}
                            </div>
                            <p className="text-gray-500 text-[10px] font-sync animate-pulse">— WAIT FOR OPPONENT —</p>
                        </div>
                    )}
                </div>
             </motion.div>
          )}

          {gameState === 'ROLE_SELECT' && (
             <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="text-center space-y-3">
                    <h2 className="text-5xl font-heading italic gold-text leading-none tracking-tight">
                        {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? "TOSS WON!" : "TOSS LOST"}
                    </h2>
                    <p className="text-gray-500 font-sync text-[10px]">DECISION PHASE</p>
                </div>

                {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? (
                    <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                        <button onClick={() => handleRoleSelect('batting')} className="flex flex-col items-center gap-6 p-10 glass-card rounded-[3rem] hover:border-yellow-500 group transition-all border-b-4 border-black active:translate-y-1">
                            <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-all shadow-xl shadow-yellow-500/5">
                                <Zap size={40} />
                            </div>
                            <span className="font-heading italic text-2xl tracking-wide">BAT FIRST</span>
                        </button>
                        <button onClick={() => handleRoleSelect('bowling')} className="flex flex-col items-center gap-6 p-10 glass-card rounded-[3rem] hover:border-cyan-500 group transition-all border-b-4 border-black active:translate-y-1">
                            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all shadow-xl shadow-cyan-500/5">
                                <ShieldCheck size={40} />
                            </div>
                            <span className="font-heading italic text-2xl tracking-wide">BOWL FIRST</span>
                        </button>
                    </div>
                ) : (
                    <div className="p-12 glass-card rounded-[4rem] text-center space-y-6 border-l-4 border-yellow-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={60} /></div>
                        <div className="flex items-center justify-center gap-2">
                             {[0,1,2].map(i => <motion.div key={i} animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, delay: i * 0.2 }} className="w-2 h-2 rounded-full bg-yellow-500" />)}
                        </div>
                        <p className="text-2xl font-heading italic text-gray-400 tracking-widest">OPPONENT DECIDING</p>
                    </div>
                )}
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                {/* 📊 MINI SCORE SUMMARY */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="glass-card p-5 rounded-[2.5rem] space-y-1 border-l-4 border-yellow-500 relative overflow-hidden">
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-sync text-yellow-500 uppercase">{me.role}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-heading italic leading-none"><CountUp value={me.score} /></span>
                                    <span className="text-[10px] font-bold text-gray-600">RUNS</span>
                                </div>
                            </div>
                            <div className="p-2 bg-white/5 rounded-xl"><UserIcon size={14} className="text-gray-600" /></div>
                        </div>
                        {room.maxWickets > 1 && (
                            <p className="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1.5"><ShieldCheck size={10} /> WKT: {me.role === 'batsman' ? room.currentWickets : '0'} / {room.maxWickets}</p>
                        )}
                    </div>
                    <div className="glass-card p-5 rounded-[2.5rem] space-y-1 text-right border-r-4 border-cyan-500 relative overflow-hidden">
                        <div className="flex items-start justify-between relative z-10">
                             <div className="p-2 bg-white/5 rounded-xl"><Activity size={14} className="text-gray-600" /></div>
                             <div>
                                <p className="text-[10px] font-sync text-cyan-500 uppercase">{opp.role}</p>
                                <div className="flex items-baseline justify-end gap-2">
                                    <span className="text-5xl font-heading italic leading-none"><CountUp value={opp.score} /></span>
                                    <span className="text-[10px] font-bold text-gray-600">RUNS</span>
                                </div>
                             </div>
                        </div>
                        {room.maxWickets > 1 && (
                            <p className="text-[10px] font-bold text-gray-400 mt-2 flex items-center justify-end gap-1.5">WKT: {opp.role === 'batsman' ? room.currentWickets : '0'} / {room.maxWickets} <ShieldCheck size={10} /></p>
                        )}
                    </div>
                </div>

                {/* 📈 MATCH INFO BAR */}
                <div className="flex justify-between items-center px-6 py-3 mb-6 glass-inset rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[10px] font-sync text-yellow-500">{room.matchMode?.replace('_', ' ')}</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[10px] font-bold text-gray-500">INN {room.innings}</span>
                    </div>
                    {room.matchMode === 'OVERS' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-600 uppercase">OVERS</span>
                            <span className="text-lg font-heading italic leading-none">{Math.floor(room.currentBalls / 6)}.{room.currentBalls % 6} <span className="text-[10px] text-gray-600">/ {room.maxOvers}</span></span>
                        </div>
                    )}
                </div>

                {room?.target && (
                    <motion.div initial={{ y: -10 }} animate={{ y: 0 }} className="mb-6 bg-gradient-to-r from-cyan-600/20 to-transparent border border-cyan-500/10 p-5 rounded-3xl flex justify-between items-center px-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-cyan-500 rounded-2xl shadow-lg shadow-cyan-500/20 text-black"><Globe size={18} /></div>
                            <div>
                                <p className="text-[10px] font-sync text-cyan-400 uppercase">Current Target</p>
                                <p className="text-3xl font-heading italic leading-none">{room.target}</p>
                            </div>
                        </div>
                        <div className="text-right relative z-10">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Requirement</p>
                            <p className="text-3xl font-heading italic text-yellow-500 leading-none">{Math.max(0, room.target - me.score)} <span className="text-xs">Runs</span></p>
                        </div>
                    </motion.div>
                )}

                {/* 🕹️ CENTER ACTION ZONE */}
                <div className="flex-1 glass-card rounded-[4rem] relative flex flex-col items-center justify-center p-8 border-b-8 border-black">
                    <AnimatePresence mode="wait">
                        {myMove ? (
                            <motion.div key="move" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                <p className="text-[10px] font-sync text-gray-600 mb-6 tracking-[0.4em] uppercase">DECISION LOCKED</p>
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[10rem] font-heading italic gold-text leading-none drop-shadow-2xl">
                                    {myMove}
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <div className="p-8 rounded-full border-2 border-dashed border-white/5 animate-spin-slow mb-6 inline-block">
                                    <Clock size={40} className="text-gray-800" />
                                </div>
                                <h3 className="text-4xl font-heading italic text-gray-700 tracking-[0.2em] leading-none mb-4">AWAITING PLAY</h3>
                                <div className="inline-flex items-center gap-3 px-6 py-3 glass-inset rounded-2xl border border-white/5">
                                    <span className="text-3xl font-heading italic text-yellow-500">{timer}</span>
                                    <div className="w-px h-6 bg-white/10" />
                                    <span className="text-[10px] font-sync text-gray-600">SEC REMAINING</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* POP RESULT OVERLAY */}
                    <AnimatePresence>
                        {lastResult && !myMove && (
                             <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(12px)' }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 rounded-[4rem]">
                                <div className="space-y-8 text-center px-10">
                                    <div className="inline-block px-8 py-3 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[11px] font-sync text-yellow-500">BALL RESULT ANALYZED</p>
                                    </div>
                                    <div className="flex items-center gap-14">
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                                            <p className="text-7xl font-heading italic text-white">{lastResult.batMove}</p>
                                            <p className="text-[10px] font-sync text-gray-500 mt-2">BATTER</p>
                                        </motion.div>
                                        <div className="h-20 w-px bg-white/10" />
                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                                            <p className="text-7xl font-heading italic text-danger">{lastResult.bowlMove}</p>
                                            <p className="text-[10px] font-sync text-gray-500 mt-2">BOWLER</p>
                                        </motion.div>
                                    </div>
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pt-8 border-t border-white/10">
                                        <p className={`text-2xl font-heading italic uppercase tracking-widest ${lastResult.batMove === lastResult.bowlMove ? 'text-danger' : 'text-success'}`}>
                                            {lastResult.batMove === lastResult.bowlMove ? 'WICKET!' : `SCORE: +${lastResult.batMove} RUNS`}
                                        </p>
                                    </motion.div>
                                </div>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 🔢 NUMERIC CONTROLLER */}
                <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-4">
                        {BUTTONS.map(n => (
                            <button 
                                key={n} 
                                disabled={myMove !== null} 
                                onClick={() => handleMove(n)} 
                                className={`num-btn ${myMove === n ? 'selected' : ''}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'FINISHED' && (
             <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12 text-center">
                <div className="relative group">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }} 
                        transition={{ duration: 4, repeat: Infinity }}
                        className="p-14 rounded-[5rem] glass-card border-4 border-yellow-500/20 shadow-4xl relative z-10"
                    >
                        <Trophy size={160} className="text-yellow-500 drop-shadow-glow" />
                    </motion.div>
                    <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] -z-10 animate-pulse" />
                </div>
                
                <div>
                   <h2 className="text-7xl font-heading italic gold-text leading-none tracking-tight mb-4 uppercase">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "CHAMPION!" : "DEFEATED"}
                   </h2>
                   <p className="text-gray-500 font-sync text-[10px] tracking-[0.4em]">HPL WORLD SERIES FINALS</p>
                </div>
                
                <div className="w-full space-y-4 max-w-xs">
                    <button onClick={onExit} className="btn-action btn-primary w-full text-2xl py-6 rounded-[3rem] shadow-3xl">NEW MATCH</button>
                    <button onClick={onExit} className="btn-action btn-secondary w-full py-4 text-sm font-sync opacity-40 hover:opacity-100 transition-opacity">RETURN TO HUB</button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 📟 LIVE MATCH TICKER */}
      {gameState === 'PLAYING' && (
          <div className="px-6 py-4 glass-inset border-t border-white/5 flex items-center gap-5 overflow-x-auto no-scrollbar z-20">
              <span className="text-[10px] font-sync text-gray-700 whitespace-nowrap">TIMELINE //</span>
              <div className="flex gap-3">
                  {room?.history?.slice(-12).reverse().map((h, i) => (
                      <div key={i} className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-heading italic text-lg border ${h.batMove === h.bowlMove ? 'bg-danger/20 border-danger/40 text-danger' : 'bg-success/20 border-success/40 text-success'}`}>
                          {h.batMove === h.bowlMove ? 'W' : h.batMove}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 💭 CHAT OVERLAY */}
      <AnimatePresence>
          {chatOpen && (
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className="fixed inset-0 z-[100] bg-surface p-8 flex flex-col">
                  <div className="scanline opacity-20" />
                  <div className="flex justify-between items-center mb-10 z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shadow-xl shadow-yellow-500/5">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-heading italic gold-text tracking-widest text-shadow-glow">ARENA SHOUTS</h3>
                            <p className="text-[8px] font-sync text-gray-600">LIVE MATCH CHATROOM</p>
                        </div>
                      </div>
                      <button onClick={() => setChatOpen(false)} className="p-4 glass-card rounded-2xl active:scale-90 transition-all border-b-4 border-black"><X size={24} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar mb-8 z-10 pr-2">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[9px] font-sync text-gray-700 uppercase">{m.username}</span>
                                  <div className="w-1 h-1 rounded-full bg-gray-800" />
                              </div>
                              <div className={`px-8 py-5 rounded-[2.5rem] max-w-[85%] font-bold text-base leading-relaxed shadow-lg ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'bg-yellow-500 text-black rounded-tr-none' : 'glass-card rounded-tl-none border border-white/10'}`}>
                                  {m.message}
                              </div>
                          </div>
                      ))}
                      {messages.length === 0 && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                              <MessageSquare size={80} />
                              <p className="font-heading italic text-2xl">NO SHOUTS YET</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="flex gap-4 z-10 relative">
                      <input 
                        value={chatMsg} 
                        onChange={(e) => setChatMsg(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && sendChat()} 
                        className="flex-1 glass-inset p-6 rounded-[2.5rem] outline-none font-bold text-lg placeholder:text-gray-700 focus:border-yellow-500/30 transition-all" 
                        placeholder="ENTER YOUR SHOUT..." 
                      />
                      <button onClick={sendChat} className="p-6 bg-yellow-500 text-black rounded-[2rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center border-b-4 border-black"><Send size={24} /></button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
