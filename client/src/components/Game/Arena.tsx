"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, ArrowLeft, Users, User as UserIcon, Zap, 
  Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, 
  ChevronRight, Share2, Info, Activity, Globe, Wifi, 
  Minus, Cpu, Battery, Radio, Target, Signal, Flame, Award
} from 'lucide-react';
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
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tossChoice, setTossChoice] = useState<string | null>(null);
  const [ballState, setBallState] = useState<'idle' | 'moving' | 'hit' | 'out'>('idle');
  const [gravityMode, setGravityMode] = useState(true);
  const [activeReactions, setActiveReactions] = useState<{id: number, emoji: string, senderId: string}[]>([]);

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
        const delay = gravityMode ? 1500 : 600;
        setTimeout(() => { setRoom(room); setLastResult(lastResult); setMyMove(null); setTimer(10); }, delay); 
    });
    socket.on('playerOut', ({ room, lastResult }) => { 
        handleBallAnimation({ ...lastResult, isOut: true });
        const delay = gravityMode ? 1500 : 600;
        setTimeout(() => {
            setRoom(room); 
            setLastResult({ type: 'OUT', ...lastResult });
            setMyMove(null); 
            setTimer(10);
        }, delay);
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
    socket.on('reactionReceived', ({ emoji, senderId }) => {
        const id = Date.now() + Math.random();
        setActiveReactions(prev => [...prev, { id, emoji, senderId }]);
        setTimeout(() => {
            setActiveReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
    });
    
    const handleKeyDown = (e: KeyboardEvent) => {
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
        socket.off('reactionReceived');
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
  
  const sendChat = () => {
    if (!chatMsg.trim() || isDemo) return;
    socket.emit('sendMessage', { roomId: room.roomId, message: chatMsg, username });
    setChatMsg("");
  };

  useEffect(() => {
    if (gameState !== 'PLAYING' || myMove !== null) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, myMove, room?.history?.length]);

  const handleMove = (val: number) => {
    if (myMove !== null || ballState !== 'idle') return;
    setMyMove(val);
    if (isDemo) {
        // Demo logic handled elsewhere or simplified
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
      if (isDemo) return;
      socket.emit('selectRole', { roomId: room.roomId, role });
  };

  const copyRoomLink = () => {
      const link = `${window.location.origin}/room/${room?.roomId}`;
      navigator.clipboard.writeText(link);
  };

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: 'OPPONENT', score: 0, role: 'bowler' };

  const sendReaction = (emoji: string) => {
    if (isDemo) return;
    socket.emit('sendReaction', { roomId: room.roomId, emoji });
  };

  return (
    <div className="broadcast-layout">
      {/* 📡 HEADER */}
      <header className="layout-header">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center hover:bg-accent-danger/20 text-accent-danger transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="h-8 w-px bg-glass-border" />
          <div>
            <h1 className="font-display text-2xl leading-none text-gradient uppercase tracking-widest">
              ROOM_{room?.roomId || '####'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="badge-live">ACTIVE MATCH</span>
              <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">{room?.matchMode?.replace('_', ' ')} MODE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] text-accent-primary font-bold uppercase">{me.name}</p>
                    <p className="text-[9px] text-foreground-muted uppercase">{me.role}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary border border-accent-primary/20">
                    <span className="font-display text-2xl">{me.score}</span>
                </div>
            </div>
            
            <div className="flex flex-col items-center">
                <div className="text-[10px] font-bold text-foreground-muted mb-1">VS</div>
                <div className="w-1 h-8 bg-glass-border rounded-full" />
            </div>

            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary border border-accent-secondary/20">
                    <span className="font-display text-2xl">{opp.score}</span>
                </div>
                <div className="text-left">
                    <p className="text-[10px] text-accent-secondary font-bold uppercase">{opp.name}</p>
                    <p className="text-[9px] text-foreground-muted uppercase">{opp.role}</p>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 rounded-lg border border-glass-border">
            <Signal size={14} className="text-accent-secondary animate-pulse" />
            <span className="text-[10px] font-bold">22MS</span>
          </div>
          <button onClick={copyRoomLink} className="p-3 bg-surface-2 rounded-lg border border-glass-border hover:bg-surface-3 transition-colors">
            <Share2 size={16} />
          </button>
        </div>
      </header>

      {/* 📊 LEFT SIDEBAR: MATCH LOG */}
      <aside className="layout-sidebar-left no-scrollbar">
        <section className="card-premium flex-1 flex flex-col min-h-0">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-accent-primary" /> Ball-by-Ball Log
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {room?.history?.slice().reverse().map((h, i) => (
              <div key={i} className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                h.batMove === h.bowlMove ? 'bg-accent-danger/5 border-accent-danger/20' : 'bg-surface-2 border-glass-border'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center font-display text-lg ${
                    h.batMove === h.bowlMove ? 'bg-accent-danger text-white' : 'bg-accent-primary text-black'
                  }`}>
                    {h.batMove}
                  </div>
                  <span className="text-[10px] font-bold text-foreground-muted">VS</span>
                  <span className="text-sm font-display">{h.bowlMove}</span>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black ${h.batMove === h.bowlMove ? 'text-accent-danger' : 'text-accent-secondary'}`}>
                    {h.batMove === h.bowlMove ? 'WICKET' : `+${h.batMove} RUNS`}
                  </p>
                  <p className="text-[8px] text-foreground-muted uppercase">{h.batsman === (isDemo ? 'ME' : socket?.id) ? 'You' : 'Opp'}</p>
                </div>
              </div>
            ))}
            {(!room?.history || room.history.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-4">
                <Target size={48} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for first delivery</p>
              </div>
            )}
          </div>
        </section>

        <section className="card-premium bg-accent-primary/5 border-accent-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-accent-primary">Match Summary</span>
            <Award size={14} className="text-accent-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-foreground-muted">Total Overs</span>
              <span className="font-bold">{room?.maxOvers || '∞'}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-foreground-muted">Total Wickets</span>
              <span className="font-bold">{room?.maxWickets || 1}</span>
            </div>
          </div>
        </section>
      </aside>

      {/* 🏏 MAIN CONTENT: ARENA */}
      <main className="layout-main no-scrollbar">
        <section className="card-premium flex-1 relative flex flex-col items-center justify-center overflow-hidden p-0 bg-gradient-to-b from-surface-2 to-surface-1">
          <AnimatePresence mode="wait">
            {gameState === 'LOBBY' && (
              <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center space-y-8 p-12">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
                    className="w-80 h-80 rounded-full border-4 border-dashed border-accent-primary/10" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users size={100} className="text-accent-primary/20 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-6">
                  <h2 className="text-5xl font-display text-gradient tracking-widest">WAITING FOR CHALLENGER</h2>
                  <div className="p-8 rounded-2xl bg-surface-2 border border-glass-border space-y-4 max-w-sm mx-auto shadow-2xl">
                    <p className="text-[10px] font-bold text-accent-primary uppercase tracking-[0.4em]">Invite Token</p>
                    <p className="text-6xl font-display tracking-widest">{room?.roomId}</p>
                    <button onClick={copyRoomLink} className="btn-action w-full py-4 text-sm">TRANSMIT INVITE</button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'TOSS' && (
              <motion.div key="toss" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12">
                <div className="text-center mb-12">
                  <h2 className="text-6xl font-display text-gradient mb-2 uppercase">THE TOSS</h2>
                  <p className="text-xs font-bold text-foreground-muted tracking-[0.5em] uppercase">Phase 01 // Call your choice</p>
                </div>
                
                {!tossChoice ? (
                  <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                    <button onClick={() => handleTossChoice('odd')} className="card-premium py-20 hover:border-accent-primary group flex flex-col items-center gap-4">
                      <span className="font-display text-7xl group-hover:scale-110 transition-transform">ODD</span>
                    </button>
                    <button onClick={() => handleTossChoice('even')} className="card-premium py-20 hover:border-accent-secondary group flex flex-col items-center gap-4">
                      <span className="font-display text-7xl text-accent-secondary group-hover:scale-110 transition-transform">EVEN</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-12 w-full max-w-xl">
                    <div className="grid grid-cols-3 gap-4">
                      {BUTTONS.map(n => (
                        <button key={n} onClick={() => handleMove(n)} className="card-premium py-10 font-display text-5xl hover:bg-accent-primary hover:text-black transition-all">
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-1 bg-surface-3 rounded-full overflow-hidden">
                        <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-full h-full bg-accent-primary" />
                      </div>
                      <p className="text-accent-primary text-[10px] font-bold animate-pulse tracking-[0.5em] uppercase">Waiting for response...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {gameState === 'ROLE_SELECT' && (
              <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12">
                <div className="text-center mb-12">
                  <h2 className="text-6xl font-display text-gradient mb-2 uppercase">
                    {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? "YOU WON THE TOSS" : "OPPONENT WON THE TOSS"}
                  </h2>
                  <p className="text-foreground-muted font-bold text-[10px] tracking-[0.3em] uppercase">Select your match strategy</p>
                </div>

                {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? (
                  <div className="grid grid-cols-2 gap-8 w-full max-w-3xl">
                    <button onClick={() => handleRoleSelect('batting')} className="btn-action p-16 flex flex-col items-center gap-6">
                      <Flame size={64} />
                      <span className="text-4xl">BATTING</span>
                    </button>
                    <button onClick={() => handleRoleSelect('bowling')} className="card-premium p-16 flex flex-col items-center gap-6 border-accent-secondary hover:bg-accent-secondary hover:text-black">
                      <ShieldCheck size={64} />
                      <span className="font-display text-4xl uppercase">BOWLING</span>
                    </button>
                  </div>
                ) : (
                  <div className="card-premium p-20 rounded-[3rem] w-full max-w-xl text-center space-y-8 bg-surface-2 border-accent-primary/20">
                    <div className="relative mx-auto w-24 h-24">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 border-4 border-accent-primary border-t-transparent rounded-full" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Radio size={40} className="text-accent-primary animate-pulse" />
                        </div>
                    </div>
                    <p className="text-3xl font-display text-accent-primary tracking-widest animate-pulse">REMOTE UNIT SELECTING...</p>
                  </div>
                )}
              </motion.div>
            )}

            {gameState === 'PLAYING' && (
              <div className="absolute inset-0 flex flex-col">
                {/* Visual Field */}
                <div className="flex-1 relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.05)_0%,transparent_70%)] py-20">
                  {room.innings === 2 && room.target && (
                    <div className="absolute top-10 px-8 py-3 bg-surface-3 rounded-full border-2 border-accent-primary/30 z-30 shadow-2xl">
                      <p className="font-display text-2xl tracking-widest text-accent-primary">
                        TARGET: {room.target} | NEED: {Math.max(0, room.target - (me.role === 'batsman' ? me.score : opp.score))}
                      </p>
                    </div>
                  )}

                  <div className="relative z-20 scale-150">
                    <BallEngine state={ballState} value={lastResult?.batMove || 0} isAntiGravity={gravityMode} />
                  </div>

                  <div className="mt-20">
                    <AnimatePresence mode="wait">
                      {myMove ? (
                        <motion.div key="locked" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                          <p className="text-[10px] font-bold text-accent-primary tracking-[0.5em] mb-4 uppercase">MOVE ENCRYPTED</p>
                          <div className="w-28 h-28 rounded-3xl bg-accent-primary text-black flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,215,0,0.3)]">
                            <span className="font-display text-7xl">{myMove}</span>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center gap-8 px-12 py-5 bg-surface-3 rounded-full border-2 border-glass-border shadow-2xl">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-foreground-muted uppercase">Sync Window</p>
                                    <p className="font-display text-4xl">{timer}s</p>
                                </div>
                                <div className="h-12 w-px bg-glass-border" />
                                <div className="flex gap-2">
                                    {[...Array(10)].map((_, i) => (
                                        <motion.div 
                                            key={i} 
                                            animate={{ opacity: timer <= i ? 0.2 : 1 }} 
                                            className={`w-2 h-10 rounded-sm ${timer <= 3 ? 'bg-accent-danger' : 'bg-accent-primary'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {lastResult && !myMove && ballState === 'idle' && (
                      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute bottom-12 flex flex-col items-center gap-8 z-40">
                        <div className="card-premium p-10 rounded-[3rem] flex items-center gap-20 border-t-4 border-accent-primary shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-surface-2/95 backdrop-blur-2xl">
                          <div className="text-center">
                            <p className="font-display text-8xl text-white">{lastResult.batMove}</p>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase mt-2">BATSMAN</p>
                          </div>
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-px h-12 bg-glass-border" />
                            <span className="font-display text-2xl text-accent-primary opacity-50">VS</span>
                            <div className="w-px h-12 bg-glass-border" />
                          </div>
                          <div className="text-center">
                            <p className="font-display text-8xl text-accent-secondary">{lastResult.bowlMove}</p>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase mt-2">BOWLER</p>
                          </div>
                        </div>
                        <div className={`px-12 py-4 rounded-full border-2 shadow-2xl ${
                          lastResult.batMove === lastResult.bowlMove ? 'bg-accent-danger text-white border-accent-danger' : 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary'
                        }`}>
                          <p className="font-display text-3xl tracking-widest">
                            {lastResult.batMove === lastResult.bowlMove ? 'OUT!' : `SCORE: +${lastResult.batMove} RUNS`}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {gameState === 'FINISHED' && (
              <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/80 z-[100] backdrop-blur-md">
                <div className="relative p-16 mb-12">
                  <motion.div animate={{ rotateY: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="relative z-10">
                    <Trophy size={240} className="text-accent-primary filter drop-shadow-[0_0_80px_rgba(255,215,0,0.4)]" />
                  </motion.div>
                  <div className="absolute inset-0 bg-accent-primary/20 blur-[150px]" />
                </div>
                
                <div className="mb-16">
                  <h2 className="text-9xl font-display text-gradient mb-4">
                    {room?.winner === (isDemo ? 'me' : socket?.id) ? "CHAMPION" : "MATCH ENDED"}
                  </h2>
                  <p className="text-accent-primary font-bold text-sm tracking-[1em] uppercase">Simulation Completed // Final Data Locked</p>
                </div>
                
                <div className="flex gap-8 w-full max-w-2xl">
                  <button onClick={onExit} className="flex-1 btn-action py-8 text-2xl">REMATCH_PROTOCOL</button>
                  <button onClick={onExit} className="flex-1 btn-premium py-8 font-display text-2xl uppercase">EXIT_TO_HUB</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Control Bar */}
        {gameState === 'PLAYING' && (
          <div className="card-premium py-6 px-12 flex items-center justify-between gap-12 bg-surface-2 border-t border-glass-border">
            <div className="flex-1 flex justify-center gap-6">
              {BUTTONS.map(n => (
                <button 
                  key={n} 
                  disabled={myMove !== null || ballState !== 'idle'} 
                  onClick={() => handleMove(n)} 
                  className={`w-24 h-24 rounded-[2rem] font-display text-6xl transition-all relative group border-2 ${
                    myMove === n 
                      ? 'border-accent-primary bg-accent-primary text-black shadow-[0_0_40px_rgba(255,215,0,0.2)]' 
                      : 'border-glass-border bg-surface-3 text-foreground-muted hover:border-accent-primary hover:text-accent-primary hover:scale-110 active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {n}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-accent-primary/20 group-hover:bg-accent-primary transition-colors rounded-full" />
                </button>
              ))}
            </div>

            <div className="h-16 w-px bg-glass-border" />

            <button 
              onClick={() => setGravityMode(!gravityMode)} 
              className={`px-8 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                gravityMode ? 'bg-accent-secondary text-black border-accent-secondary shadow-lg shadow-accent-secondary/20' : 'text-foreground-muted border-glass-border'
              }`}
            >
              <Zap size={24} className={gravityMode ? 'animate-pulse' : ''} />
              <span className="font-display text-xs uppercase">Anti-Grav {gravityMode ? 'Active' : 'Offline'}</span>
            </button>
          </div>
        )}
      </main>

      {/* 🤖 RIGHT SIDEBAR: COMMS & CHAT */}
      <aside className="layout-sidebar-right no-scrollbar">
        <section className="card-premium flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} className="text-accent-primary" /> Tactical Comms
            </h3>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent-secondary/40" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar flex flex-col-reverse mb-6">
            {[...messages].reverse().map((m, i) => (
              <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-[90%] text-sm leading-relaxed ${
                  m.senderId === (isDemo ? 'me' : socket?.id) 
                    ? 'bg-accent-primary text-black rounded-tr-none font-bold' 
                    : 'bg-surface-2 text-white border border-glass-border rounded-tl-none'
                }`}>
                  {m.message}
                </div>
                <span className="text-[8px] font-bold text-foreground-muted mt-1 uppercase tracking-tighter">{m.username}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center gap-4">
                <Radio size={48} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Transmission</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input 
              value={chatMsg} 
              onChange={(e) => setChatMsg(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && sendChat()} 
              className="flex-1 input-premium py-3 text-sm h-auto" 
              placeholder="Type message..." 
            />
            <button onClick={sendChat} className="w-12 h-12 bg-accent-primary text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <Send size={18} />
            </button>
          </div>
        </section>

        <section className="card-premium">
            <h3 className="text-[10px] font-bold uppercase text-foreground-muted mb-4 tracking-widest">Battle Reactions</h3>
            <div className="grid grid-cols-5 gap-2">
                {['🔥', '👏', '😮', '😂', '💯'].map(emoji => (
                    <button 
                        key={emoji} 
                        onClick={() => { sendReaction(emoji); const id = Date.now(); setActiveReactions(prev => [...prev, {id, emoji, senderId: socket?.id || 'me'}]); setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 3000); }} 
                        className="h-12 flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 border border-glass-border hover:border-accent-primary transition-all text-2xl"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </section>

        <div className="card-premium p-4 flex items-center justify-between bg-surface-2 border-accent-secondary/20">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent-secondary animate-ping" />
                <span className="text-[10px] font-bold uppercase">Uplink Stable</span>
            </div>
            <Clock size={14} className="text-foreground-muted" />
        </div>
      </aside>

      {/* Floating Reactions Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1000]">
        <AnimatePresence>
          {activeReactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: '90vh', x: r.senderId === (isDemo ? 'me' : socket?.id) ? '5vw' : '85vw', opacity: 0, scale: 0.5 }}
              animate={{ y: '20vh', opacity: 1, scale: 3 }}
              exit={{ opacity: 0, scale: 5 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute text-6xl filter drop-shadow-2xl"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="layout-footer">
        <div className="flex items-center gap-2">
          <Signal size={12} className="text-accent-secondary" />
          <span>MATCH_SERVER_INDIA_01</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-surface-3" />
        <span>HPL ARENA // BROADCAST v2.4</span>
      </footer>
    </div>
  );
}

