"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, ChevronRight, Share2, Info, Activity, Globe, Wifi, Minus, Cpu, Battery, Radio } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
import CountUp from '@/components/UI/CountUp';
import BallEngine from '@/components/Game/BallEngine';
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
  const [ballState, setBallState] = useState<'idle' | 'moving' | 'hit' | 'out'>('idle');
  const [gravityMode, setGravityMode] = useState(true);

  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    win: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.4 }),
    start: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_06253c5cd1.mp3'], volume: 0.5 }),
    whoosh: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/15/audio_51a34b3e8e.mp3'], volume: 0.3 })
  };

  useEffect(() => {
    if (!socket || isDemo) return;
    socket.on('playerJoined', (r) => setRoom(r));
    socket.on('tossChoiceLocked', ({ choice }) => setTossChoice(choice));
    socket.on('tossResult', (res) => { setLastResult({ type: 'TOSS', ...res }); setGameState('ROLE_SELECT'); });
    socket.on('gameStarted', (r) => { setRoom(r); setGameState('PLAYING'); setLastResult(null); });
    socket.on('updateScore', ({ room, lastResult }) => { 
        handleBallAnimation(lastResult);
        setTimeout(() => { setRoom(room); setLastResult(lastResult); setMyMove(null); setTimer(10); }, 1500); 
    });
    socket.on('playerOut', ({ room, lastResult }) => { 
        handleBallAnimation({ ...lastResult, isOut: true });
        setTimeout(() => {
            setRoom(room); 
            setLastResult({ type: 'OUT', ...lastResult });
            setMyMove(null); 
            setTimer(10);
        }, 1500);
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
        }, 3000);
    });
    socket.on('messageReceived', (msg) => setMessages(prev => [...prev, msg]));
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (chatOpen) return;
        const key = parseInt(e.key);
        if (key >= 1 && key <= 6) {
            handleMove(key);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
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

  const handleBallAnimation = (res: any) => {
      setBallState('moving');
      sounds.whoosh.play();
      setTimeout(() => {
          if (res.isOut) {
              setBallState('out');
              sounds.wicket.play();
          } else {
              setBallState('hit');
              sounds.bat.play();
          }
          setTimeout(() => setBallState('idle'), 1000);
      }, gravityMode ? 1500 : 600);
  };

  const resolveDemoMove = (playerVal: number) => {
      const botVal = Math.floor(Math.random() * 6) + 1;
      const isOut = playerVal === botVal;
      handleBallAnimation({ isOut });
      
      setTimeout(() => {
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
              if (me.role === 'batsman') updatedMe.score += playerVal;
              else updatedOpp.score += botVal;
              setLastResult({ batMove: me.role === 'batsman' ? playerVal : botVal, bowlMove: me.role === 'bowler' ? playerVal : botVal });
              if (nextInnings === 2 && ((me.role === 'batsman' && updatedMe.score >= nextTarget) || (opp.role === 'batsman' && updatedOpp.score >= nextTarget))) {
                  nextGameState = 'FINISHED';
              }
          }

          setRoom({ ...room, players: [updatedMe, updatedOpp], history: newHistory, innings: nextInnings, target: nextTarget, winner: nextGameState === 'FINISHED' ? (updatedMe.score >= (nextTarget || 0) ? 'me' : 'opp') : null });
          setGameState(nextGameState);
          setMyMove(null);
      }, gravityMode ? 1500 : 600);
  };

  const handleMove = (val: number) => {
    if (myMove !== null || ballState !== 'idle') return;
    setMyMove(val);
    if (isDemo) {
        setTimeout(() => resolveDemoMove(val), 500);
        return;
    }
    if (gameState === 'TOSS') socket.emit('sendTossNumber', { roomId: room.roomId, number: val });
    else if (gameState === 'PLAYING') socket.emit('sendNumber', { roomId: room.roomId, number: val });
  };

  const handleTossChoice = (choice: string) => {
      if (isDemo) { setTossChoice(choice); return; }
      socket.emit('tossChoice', { roomId: room.roomId, choice });
  };

  const handleRoleSelect = (role: string) => {
      if (isDemo) {
          setRoom({ ...room, players: [ { id: 'me', name: username, score: 0, role: role === 'batting' ? 'batsman' : 'bowler' }, { id: 'bot', name: 'AI_SIMULATOR', score: 0, role: role === 'batting' ? 'bowler' : 'batsman' } ] });
          setGameState('PLAYING');
          return;
      }
      socket.emit('selectRole', { roomId: room.roomId, role });
  };

  const copyRoomLink = () => {
      const link = `${window.location.origin}/room/${room?.roomId}`;
      navigator.clipboard.writeText(link);
  };

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: 'OPPONENT', score: 0, role: 'bowler' };

  return (
    <div className="game-container">
      <div className="particle-container opacity-20">
          {[...Array(15)].map((_, i) => (
             <motion.div key={i} animate={{ y: [-20, 20, -20], opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }} transition={{ duration: 5 + i, repeat: Infinity }} className="absolute bg-cyan-500/10 rounded-full blur-3xl" style={{ width: '200px', height: '200px', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
          ))}
      </div>
      <div className="scanline" />
      
      <div className="desktop-layout z-20">
        {/* ================= LEFT SIDE PANEL ================= */}
        <aside className="side-panel">
            <div className="glass-card flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <UserIcon className="text-cyan-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-sync text-cyan-500/50">LOCAL_PLAYER</p>
                        <h3 className="text-lg font-cyber text-white">{username}</h3>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-sync text-gray-500">OPERATIONAL_ROLE</span>
                        <span className="text-xs font-cyber text-cyan-500">{me.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-sync text-gray-500">SESSION_STABILITY</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-3 bg-cyan-500 shadow-[0_0_5px_cyan]" />)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card flex-1 flex flex-col min-h-0">
                <h4 className="text-[10px] font-sync text-gray-500 mb-4 flex items-center gap-2">
                    <Activity size={12} className="text-cyan-500" /> DATA_LOG_STREAM
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {room?.history?.slice().reverse().map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-md flex items-center justify-center font-cyber text-xs ${h.batMove === h.bowlMove ? 'bg-pink-500/20 text-pink-500' : 'bg-cyan-500/20 text-cyan-500'}`}>
                                    {h.batMove}
                                </span>
                                <span className="text-[8px] font-sync text-gray-500">VS</span>
                                <span className="text-xs font-cyber text-pink-500">{h.bowlMove}</span>
                            </div>
                            <span className={`text-[10px] font-cyber ${h.batMove === h.bowlMove ? 'text-pink-500' : 'text-emerald-500'}`}>
                                {h.batMove === h.bowlMove ? 'WKT' : `+${h.batMove}`}
                            </span>
                        </div>
                    ))}
                    {(!room?.history || room.history.length === 0) && (
                        <p className="text-[10px] font-sync text-gray-700 text-center mt-10 italic">NO_DATA_AVAILABLE</p>
                    )}
                </div>
            </div>
            
            <button onClick={onExit} className="glass-card hover:bg-pink-500/10 hover:border-pink-500/30 group transition-all">
                <div className="flex items-center gap-3">
                    <ArrowLeft size={16} className="text-gray-500 group-hover:text-pink-500" />
                    <span className="text-xs font-cyber text-gray-500 group-hover:text-pink-500">TERMINATE_LINK</span>
                </div>
            </button>
        </aside>

        {/* ================= CENTER MAIN ARENA ================= */}
        <main className="flex flex-col gap-6 min-w-0">
            {/* Header / Room Info */}
            <div className="header-broadcast glass-card p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[8px] font-sync text-cyan-500/50">SECURE_ROOM</p>
                        <h2 className="text-xl font-cyber text-white tracking-widest">{room?.roomId}</h2>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <Globe size={16} className="text-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-sync text-gray-400">{room?.matchMode?.replace('_', ' ')} MODE</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[8px] font-sync text-gray-500">SYNC_TIME</p>
                        <p className="text-sm font-cyber text-white">{new Date().toLocaleTimeString()}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-cyan-500/20 flex items-center justify-center">
                        <Wifi size={16} className="text-cyan-500" />
                    </div>
                </div>
            </div>

            <div className="flex-1 glass-card relative flex flex-col overflow-hidden p-0">
                <AnimatePresence mode="wait">
                  {gameState === 'LOBBY' && (
                     <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center space-y-10">
                        <div className="relative">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-64 h-64 rounded-full border-2 border-dashed border-cyan-500/20" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Cpu size={80} className="text-cyan-500/10 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-6">
                            <h2 className="text-4xl font-cyber neon-text tracking-[0.2em] animate-pulse">ESTABLISHING_LINK...</h2>
                            <div className="hud-panel p-10 rounded-3xl space-y-4 border-t-2 border-cyan-500 max-w-sm mx-auto">
                                <p className="text-[10px] font-sync text-cyan-500/50">MATCH_INVITE_TOKEN</p>
                                <p className="text-4xl font-cyber tracking-widest text-white">{room?.roomId}</p>
                                <button onClick={copyRoomLink} className="w-full btn-cyber btn-primary-neon text-xs font-cyber mt-4 py-4">
                                    <Share2 size={16} /> TRANSMIT_INVITE
                                </button>
                            </div>
                        </div>
                     </motion.div>
                  )}

                  {gameState === 'TOSS' && (
                     <motion.div key="toss" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12">
                        <div className="text-center space-y-2 mb-12">
                            <h2 className="text-5xl font-cyber neon-text">INITIATING_TOSS</h2>
                            <p className="text-xs font-sync text-cyan-500/40 tracking-[0.5em]">PHASE_01 // PROBABILITY_COMPUTATION</p>
                        </div>
                        
                        {!tossChoice ? (
                            <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                                <button onClick={() => handleTossChoice('odd')} className="btn-cyber py-16 font-cyber text-5xl hover:border-cyan-500 group">
                                    <span className="group-hover:scale-110 transition-transform">ODD</span>
                                </button>
                                <button onClick={() => handleTossChoice('even')} className="btn-cyber py-16 font-cyber text-5xl hover:border-pink-500 text-pink-500 group">
                                    <span className="group-hover:scale-110 transition-transform">EVEN</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-12 w-full max-w-xl">
                                <div className="grid grid-cols-3 gap-4">
                                    {BUTTONS.map(n => (
                                        <button key={n} onClick={() => handleMove(n)} className="btn-cyber font-cyber text-4xl h-28 active:scale-95">{n}</button>
                                    ))}
                                </div>
                                <div className="flex flex-col items-center gap-3">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }} className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                                    <p className="text-cyan-500 text-[10px] font-sync animate-pulse tracking-[0.5em]">WAITING_FOR_REMOTE_RESPONSE</p>
                                </div>
                            </div>
                        )}
                     </motion.div>
                  )}

                  {gameState === 'ROLE_SELECT' && (
                     <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-cyber neon-text mb-2">
                                {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? "TOSS_WON" : "TOSS_LOST"}
                            </h2>
                            <p className="text-gray-500 font-sync text-[10px] tracking-[0.3em]">SELECT_OPERATIONAL_STRATEGY</p>
                        </div>

                        {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? (
                            <div className="grid grid-cols-2 gap-8 w-full max-w-3xl">
                                <button onClick={() => handleRoleSelect('batting')} className="btn-cyber btn-primary-neon p-12 flex flex-col gap-4">
                                    <Zap size={48} />
                                    <span className="font-cyber text-3xl">BATTING</span>
                                    <span className="text-[10px] font-sync opacity-60">OFFENSIVE_MODE</span>
                                </button>
                                <button onClick={() => handleRoleSelect('bowling')} className="btn-cyber p-12 flex flex-col gap-4 border-pink-500/30 text-pink-500 hover:bg-pink-500/10 transition-all">
                                    <ShieldCheck size={48} />
                                    <span className="font-cyber text-3xl">BOWLING</span>
                                    <span className="text-[10px] font-sync opacity-60">DEFENSIVE_MODE</span>
                                </button>
                            </div>
                        ) : (
                            <div className="hud-panel p-16 rounded-[4rem] w-full max-w-xl text-center space-y-8">
                                <motion.div animate={{ scale: [1, 1.1, 1], rotate: 360 }} transition={{ repeat: Infinity, duration: 3 }} className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                                <p className="text-2xl font-cyber text-cyan-500 tracking-widest animate-pulse">REMOTE_UNIT_SELECTING...</p>
                                <p className="text-[10px] font-sync text-gray-600 uppercase">Wait for opponent to choose their role</p>
                            </div>
                        )}
                     </motion.div>
                  )}

                  {gameState === 'PLAYING' && (
                     <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col p-8">
                        {/* 📊 Score HUD */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="hud-panel p-8 rounded-3xl border-l-[6px] border-cyan-500 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100} /></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[10px] font-sync text-cyan-500 mb-2">{me.role === 'batsman' ? 'OFFENSIVE' : 'DEFENSIVE'}_STRENGTH</p>
                                        <h3 className="text-xs font-cyber text-gray-500">{username}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-7xl font-cyber leading-none"><CountUp value={me.score} /></span>
                                            <span className="text-xs font-sync text-gray-600">PTS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="hud-panel p-8 rounded-3xl border-r-[6px] border-pink-500 relative group overflow-hidden text-right">
                                <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={100} /></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-xs font-sync text-gray-600">PTS</span>
                                            <span className="text-7xl font-cyber leading-none text-pink-500"><CountUp value={opp.score} /></span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-sync text-pink-500 mb-2">{opp.role === 'batsman' ? 'OFFENSIVE' : 'DEFENSIVE'}_UNIT</p>
                                        <h3 className="text-xs font-cyber text-gray-500">{opp.name}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🔮 Pitch */}
                        <div className="flex-1 relative flex flex-col items-center justify-center rounded-[3rem] bg-gradient-to-b from-transparent to-cyan-500/5 border border-white/5 shadow-inner group py-12">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                            
                            {/* Target info for 2nd innings */}
                            {room.innings === 2 && room.target && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-2 glass-inset rounded-full border border-cyan-500/20 z-30">
                                    <p className="text-[10px] font-sync text-cyan-500 tracking-widest whitespace-nowrap">
                                        TARGET: <span className="text-white text-sm font-cyber">{room.target}</span> | 
                                        NEED: <span className="text-white text-sm font-cyber">{room.target - (me.role === 'batsman' ? me.score : opp.score)}</span>
                                    </p>
                                </div>
                            )}

                            <div className="relative z-20 scale-125">
                                <BallEngine state={ballState} value={lastResult?.batMove || 0} isAntiGravity={gravityMode} />
                            </div>

                            <div className="mt-12 text-center relative z-10">
                                <AnimatePresence mode="wait">
                                    {myMove ? (
                                        <motion.div key="locked" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                            <p className="text-[10px] font-sync text-cyan-500 tracking-[0.8em] mb-4">SIGNAL_ENCRYPTED</p>
                                            <div className="w-24 h-24 rounded-2xl border-2 border-cyan-500 flex items-center justify-center mx-auto bg-cyan-500/10">
                                                <p className="text-6xl font-cyber neon-text">{myMove}</p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                            <div className="flex items-center gap-6 px-10 py-4 glass-inset rounded-full border border-white/10">
                                                <div className="flex flex-col items-start leading-none">
                                                    <span className="text-[8px] font-sync text-gray-500">SYNC_WINDOW</span>
                                                    <span className="text-2xl font-cyber text-white">{timer}s</span>
                                                </div>
                                                <div className="h-10 w-px bg-white/10" />
                                                <div className="flex items-center gap-3">
                                                    {[...Array(6)].map((_, i) => (
                                                        <motion.div key={i} animate={{ opacity: timer <= i+1 ? 0.2 : 1 }} className={`w-2 h-6 rounded-sm ${timer <= 3 ? 'bg-pink-500' : 'bg-cyan-500'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <AnimatePresence>
                                {lastResult && !myMove && ballState === 'idle' && (
                                     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute bottom-10 flex flex-col items-center gap-6 z-40">
                                        <div className="hud-panel p-8 rounded-[2rem] flex items-center gap-16 border-t-4 border-cyan-500 shadow-2xl backdrop-blur-xl">
                                            <div className="text-center group">
                                                <p className="text-6xl font-cyber text-white group-hover:scale-110 transition-transform">{lastResult.batMove}</p>
                                                <p className="text-[8px] font-sync text-gray-500 mt-2">BATSMAN</p>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="w-px h-16 bg-white/10" />
                                                <span className="text-[10px] font-sync text-cyan-500/30 my-2">VS</span>
                                                <div className="w-px h-16 bg-white/10" />
                                            </div>
                                            <div className="text-center group">
                                                <p className="text-6xl font-cyber text-pink-500 group-hover:scale-110 transition-transform">{lastResult.bowlMove}</p>
                                                <p className="text-[8px] font-sync text-gray-500 mt-2">BOWLER</p>
                                            </div>
                                        </div>
                                        <div className="px-10 py-3 rounded-full bg-black/80 border border-cyan-500/30">
                                            <p className={`text-2xl font-cyber tracking-[0.5em] ${lastResult.batMove === lastResult.bowlMove ? 'text-pink-500 animate-bounce' : 'text-emerald-500'}`}>
                                                {lastResult.batMove === lastResult.bowlMove ? 'OUT_SYSTEM' : `SUCCESS_RUNS_+${lastResult.batMove}`}
                                            </p>
                                        </div>
                                     </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                     </motion.div>
                  )}

                  {gameState === 'FINISHED' && (
                     <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/60 z-[100]">
                        <div className="relative group p-12 mb-10">
                            <motion.div animate={{ rotateY: 360 }} transition={{ duration: 5, repeat: Infinity }} className="relative z-10">
                                <Trophy size={200} className="text-cyan-400 filter drop-shadow-[0_0_50px_rgba(0,243,255,0.6)]" />
                            </motion.div>
                            <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] animate-pulse" />
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 border-4 border-cyan-500 rounded-full" />
                        </div>
                        
                        <div className="mb-12">
                           <h2 className="text-8xl font-cyber neon-text mb-4 tracking-tighter">
                                {room?.winner === (isDemo ? 'me' : socket?.id) ? "CHAMPION" : "DEFEAT"}
                           </h2>
                           <p className="text-cyan-500 font-sync text-xs tracking-[1em]">SIMULATION_COMPLETED // FINAL_DATA_LOCKED</p>
                        </div>
                        
                        <div className="flex gap-6 w-full max-w-xl">
                            <button onClick={onExit} className="flex-1 btn-cyber btn-primary-neon py-8 text-2xl group">
                                <span className="group-hover:tracking-[0.2em] transition-all">REBOOT_SYSTEM</span>
                            </button>
                            <button onClick={onExit} className="flex-1 btn-cyber py-8 text-xs font-sync text-gray-500 hover:text-white transition-all">EXIT_TO_HUB</button>
                        </div>
                     </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Input Panel / Controls */}
            {gameState === 'PLAYING' && (
                <div className="glass-card flex items-center justify-between gap-8 py-6 px-10">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-sync text-cyan-500/50">INPUT_INTERFACE</span>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-cyber border border-white/10 text-gray-500">KBD_SUPPORT</span>
                                <span className="px-2 py-1 bg-cyan-500/10 rounded text-[8px] font-cyber border border-cyan-500/20 text-cyan-500">[1-6]</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex justify-center gap-4">
                        {BUTTONS.map(n => (
                            <button 
                                key={n} 
                                disabled={myMove !== null || ballState !== 'idle'} 
                                onClick={() => handleMove(n)} 
                                className={`w-20 h-20 rounded-2xl font-cyber text-4xl transition-all relative group overflow-hidden border-2 ${
                                    myMove === n 
                                    ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_20px_rgba(0,243,255,0.3)] text-cyan-500' 
                                    : 'border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/30 hover:scale-105 active:scale-90'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {n}
                                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-500/20 group-hover:bg-cyan-500 transition-colors rounded-t-full" />
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setGravityMode(!gravityMode)} className={`px-4 py-6 rounded-2xl border transition-all flex flex-col items-center gap-2 w-24 ${gravityMode ? 'bg-cyan-500 text-black border-cyan-500' : 'text-gray-500 border-white/10'}`}>
                            <Zap size={20} className={gravityMode ? 'animate-pulse' : ''} />
                            <span className="text-[8px] font-cyber text-center leading-tight">ANTI_GRAV <br/> {gravityMode ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>
            )}
        </main>

        {/* ================= RIGHT SIDE PANEL ================= */}
        <aside className="side-panel">
            <div className="glass-card flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                        <Cpu className="text-pink-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-sync text-pink-500/50">REMOTE_OPPONENT</p>
                        <h3 className="text-lg font-cyber text-white">{opp.name}</h3>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-sync">
                        <span className="text-gray-500">PING_LATENCY</span>
                        <span className="text-emerald-500">22MS // STABLE</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-sync">
                        <span className="text-gray-500">PACKET_LOSS</span>
                        <span className="text-cyan-500">0.00%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-1/2 h-full bg-cyan-500/30" />
                    </div>
                </div>
            </div>

            <div className="glass-card flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-sync text-gray-500 flex items-center gap-2">
                        <MessageSquare size={12} className="text-cyan-500" /> COMMS_LINK
                    </h4>
                    {messages.length > 0 && <span className="text-[8px] font-cyber bg-cyan-500 text-black px-2 py-0.5 rounded-full">{messages.length}</span>}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar flex flex-col-reverse">
                    {[...messages].reverse().map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                            <span className="text-[7px] font-cyber text-gray-600 mb-1">{m.username}</span>
                            <div className={`px-4 py-3 rounded-xl max-w-[90%] font-cyber text-xs leading-relaxed ${
                                m.senderId === (isDemo ? 'me' : socket?.id) 
                                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,243,255,0.2)] rounded-tr-none' 
                                : 'bg-white/5 text-white/80 border border-white/10 rounded-tl-none'
                            }`}>
                                {m.message}
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
                            <MessageSquare size={32} />
                            <p className="text-[10px] font-sync text-center uppercase">No messages transmitted</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex gap-2">
                    <input 
                        value={chatMsg} 
                        onChange={(e) => setChatMsg(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && sendChat()} 
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-cyber outline-none focus:border-cyan-500/50 transition-colors" 
                        placeholder="ENTER_MOD_COMMS..." 
                    />
                    <button onClick={sendChat} className="p-3 bg-cyan-500 text-black rounded-xl hover:scale-105 active:scale-95 transition-all">
                        <Send size={16} />
                    </button>
                </div>
            </div>

            <div className="glass-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-sync text-emerald-500/80">SYSTEMS_OPTIMAL</span>
                </div>
                <div className="flex gap-4">
                    <Info size={14} className="text-gray-600 hover:text-cyan-500 cursor-pointer" />
                    <Share2 size={14} onClick={copyRoomLink} className="text-gray-600 hover:text-cyan-500 cursor-pointer" />
                </div>
            </div>
        </aside>
      </div>

    </div>
  );
}
