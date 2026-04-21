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
          {[...Array(10)].map((_, i) => (
             <motion.div key={i} animate={{ y: [-10, 10, -10], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4 + i, repeat: Infinity }} className="absolute bg-cyan-500 rounded-full blur-xl" style={{ width: '100px', height: '100px', left: `${i * 10}%`, top: `${i * 10}%` }} />
          ))}
      </div>
      <div className="scanline" />
      
      {/* 📡 CYBER TOP BAR */}
      <div className="p-4 flex items-center justify-between border-b border-cyan-500/10 z-50 hud-panel">
        <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hud-panel rounded-lg hover:border-cyan-500 transition-all">
                <ArrowLeft size={16} className="text-cyan-500" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-xl font-cyber neon-text leading-none">HPL_LIVE</h1>
                <p className="text-[6px] font-sync text-cyan-500/40">SECURE_SYNC: ACTIVE</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                    <Radio size={10} className="text-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-cyber text-emerald-500">STABLE</span>
                </div>
                <div className="flex items-center gap-1">
                    <Battery size={10} className="text-cyan-500" />
                    <span className="text-[6px] font-sync text-cyan-500/50">99% POW</span>
                </div>
            </div>
            <button onClick={() => setChatOpen(true)} className="p-2 hud-panel rounded-lg relative">
                <MessageSquare size={16} />
                {messages.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full neon-border shadow-lg" />}
            </button>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col relative overflow-hidden z-20">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-56 h-56 rounded-full border-2 border-dashed border-cyan-500/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu size={64} className="text-cyan-500/20 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-6">
                    <h2 className="text-3xl font-cyber neon-text">SCANNING FOR REALMS...</h2>
                    <div className="hud-panel p-8 rounded-3xl space-y-4 border-t-2 border-cyan-500">
                        <p className="text-[8px] font-sync text-cyan-500/50">MATCH_TOKEN</p>
                        <p className="text-4xl font-cyber tracking-widest text-white">{room?.roomId}</p>
                        <button onClick={copyRoomLink} className="w-full btn-cyber btn-primary-neon text-[10px] font-cyber mt-4">
                            <Share2 size={16} /> TRANSMIT_INVITE
                        </button>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'TOSS' && (
             <motion.div key="toss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-cyber neon-text">DECISION_LOOP</h2>
                    <p className="text-[8px] font-sync text-cyan-500/40 tracking-[0.5em]">TOSS_PHASE: 01</p>
                </div>
                
                {!tossChoice ? (
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button onClick={() => handleTossChoice('odd')} className="btn-cyber py-10 font-cyber text-3xl hover:border-cyan-500 neon-text">ODD</button>
                        <button onClick={() => handleTossChoice('even')} className="btn-cyber py-10 font-cyber text-3xl hover:border-pink-500 neon-text text-pink-500">EVEN</button>
                    </div>
                ) : (
                    <div className="space-y-8 w-full">
                        <div className="grid grid-cols-3 gap-3">
                            {BUTTONS.map(n => (
                                <button key={n} onClick={() => handleMove(n)} className="btn-cyber font-cyber text-3xl h-20 active:scale-90">{n}</button>
                            ))}
                        </div>
                        <p className="text-cyan-500 text-[8px] font-sync animate-pulse text-center tracking-[0.5em]">WAITING_FOR_OPPONENT_DATA</p>
                    </div>
                )}
             </motion.div>
          )}

          {gameState === 'ROLE_SELECT' && (
             <motion.div key="role" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="text-center">
                    <h2 className="text-3xl font-cyber neon-text mb-1">
                        {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? "SUCCESS: LINK_ESTABLISHED" : "FAILURE: SIGNAL_INTERRUPT"}
                    </h2>
                    <p className="text-gray-500 font-sync text-[8px]">SELECT OPERATIONAL MODE</p>
                </div>

                {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? (
                    <div className="grid gap-4 w-full">
                        <button onClick={() => handleRoleSelect('batting')} className="btn-cyber btn-primary-neon p-8">
                            <Zap size={32} />
                            <span className="font-cyber text-2xl">INITIATE ATTACK [BAT]</span>
                        </button>
                        <button onClick={() => handleRoleSelect('bowling')} className="btn-cyber p-8 border-pink-500/30 text-pink-500">
                            <ShieldCheck size={32} />
                            <span className="font-cyber text-2xl">INITIATE DEFENSE [BOWL]</span>
                        </button>
                    </div>
                ) : (
                    <div className="hud-panel p-10 rounded-[3rem] w-full text-center space-y-6">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }} className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                        <p className="text-xl font-cyber text-cyan-500 tracking-widest animate-pulse">REMOTE_UNIT_SELECTING</p>
                    </div>
                )}
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                {/* 📊 HUD SCOREBOARDS */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="hud-panel p-5 rounded-2xl border-l-2 border-cyan-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><Zap size={40} /></div>
                        <p className="text-[7px] font-sync text-cyan-500 uppercase mb-2">{me.role}_SYSTEM</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-cyber leading-none"><CountUp value={me.score} /></span>
                            <span className="text-[8px] font-cyber text-gray-500">PTS</span>
                        </div>
                    </div>
                    <div className="hud-panel p-5 rounded-2xl border-r-2 border-pink-500 text-right">
                        <p className="text-[7px] font-sync text-pink-500 uppercase mb-2">{opp.role}_UNIT</p>
                        <div className="flex items-baseline justify-end gap-2">
                             <span className="text-5xl font-cyber leading-none text-pink-500"><CountUp value={opp.score} /></span>
                             <span className="text-[8px] font-cyber text-gray-500">PTS</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4 py-2 mb-4 hud-panel rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="text-[7px] font-sync text-cyan-500">{room.matchMode?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {room.maxWickets > 1 && <span className="text-[8px] font-cyber text-gray-500">WKT_LOSS: {room.currentWickets}/{room.maxWickets}</span>}
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <button onClick={() => setGravityMode(!gravityMode)} className={`text-[7px] font-cyber px-2 py-1 rounded border transition-all ${gravityMode ? 'bg-cyan-500 text-black border-cyan-500' : 'text-gray-500 border-white/10'}`}>GRAVITY: {gravityMode ? 'ANTI' : 'NORM'}</button>
                            <span className="text-[7px] font-sync text-gray-500">INN {room.innings}</span>
                        </div>
                    </div>
                </div>

                {/* 🔮 ANTI-GRAVITY ENGINE AREA */}
                <div className="flex-1 hud-panel rounded-[3rem] relative flex flex-col items-center justify-center p-8 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
                    
                    <BallEngine state={ballState} value={lastResult?.batMove || 0} isAntiGravity={gravityMode} />

                    <div className="mt-8 text-center">
                        <AnimatePresence mode="wait">
                            {myMove ? (
                                <motion.div key="locked" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                    <p className="text-[8px] font-sync text-cyan-500 tracking-[0.5em] mb-2">SIGNAL_LOCKED</p>
                                    <p className="text-4xl font-cyber neon-text">{myMove}</p>
                                </motion.div>
                            ) : (
                                <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="flex items-center gap-3 px-6 py-2 glass-inset rounded-full">
                                        <Clock size={12} className="text-gray-600" />
                                        <span className="text-xl font-cyber text-gray-600">{timer}</span>
                                        <span className="text-[7px] font-sync text-gray-800">SYNC_WINDOW</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* BALL RESULT OVERLAY */}
                    <AnimatePresence>
                        {lastResult && !myMove && ballState === 'idle' && (
                             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 z-40">
                                <div className="hud-panel p-6 rounded-2xl flex items-center gap-10 border-t-4 border-cyan-500">
                                    <div className="text-center">
                                        <p className="text-4xl font-cyber text-white">{lastResult.batMove}</p>
                                        <p className="text-[6px] font-sync text-gray-500 mt-1">ATTACK</p>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-4xl font-cyber text-pink-500">{lastResult.bowlMove}</p>
                                        <p className="text-[6px] font-sync text-gray-500 mt-1">DEFENSE</p>
                                    </div>
                                </div>
                                <p className={`text-xl font-cyber tracking-widest ${lastResult.batMove === lastResult.bowlMove ? 'text-pink-500 animate-bounce' : 'text-emerald-500'}`}>
                                    {lastResult.batMove === lastResult.bowlMove ? 'SYSTEM_OUT' : `SCORE_+${lastResult.batMove}`}
                                </p>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 🔟 INPUT PANEL */}
                <div className="mt-6 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-3">
                        {BUTTONS.map(n => (
                            <button 
                                key={n} 
                                disabled={myMove !== null || ballState !== 'idle'} 
                                onClick={() => handleMove(n)} 
                                className={`btn-cyber font-cyber text-2xl h-16 ${myMove === n ? 'border-cyan-500 bg-cyan-500/10' : 'opacity-40 hover:opacity-100'}`}
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
                <div className="relative group p-10">
                    <motion.div animate={{ rotateY: 360 }} transition={{ duration: 4, repeat: Infinity }} className="relative z-10">
                        <Trophy size={140} className="text-cyan-400 drop-shadow-[0_0_30px_rgba(0,243,255,0.5)]" />
                    </motion.div>
                    <div className="absolute inset-0 bg-cyan-500/10 blur-[60px] animate-pulse" />
                </div>
                
                <div>
                   <h2 className="text-6xl font-cyber neon-text mb-2 tracking-tighter">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "CHAMPION_UNIT" : "UNIT_DESTROYED"}
                   </h2>
                   <p className="text-cyan-500 font-sync text-[8px] tracking-[0.6em]">SIMULATION_END // RESULT_FINAL</p>
                </div>
                
                <div className="w-full space-y-4 max-w-xs">
                    <button onClick={onExit} className="w-full btn-cyber btn-primary-neon py-6 text-xl">NEW_SESSION</button>
                    <button onClick={onExit} className="w-full btn-cyber py-4 text-[9px] font-sync opacity-40">EXIT_TO_MAIN_HUB</button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 📟 DATA TICKER */}
      {gameState === 'PLAYING' && (
          <div className="px-4 py-3 hud-panel border-t border-cyan-500/10 flex items-center gap-4 overflow-x-auto no-scrollbar z-20">
              <span className="text-[8px] font-sync text-cyan-800 whitespace-nowrap">LOG_HISTORY //</span>
              <div className="flex gap-2">
                  {room?.history?.slice(-8).reverse().map((h, i) => (
                      <div key={i} className={`flex-shrink-0 px-3 py-1 rounded border font-cyber text-xs ${h.batMove === h.bowlMove ? 'bg-pink-500/20 border-pink-500/40 text-pink-500' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-500'}`}>
                          {h.batMove === h.bowlMove ? 'OUT' : h.batMove}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 💭 CHAT MODULE */}
      <AnimatePresence>
          {chatOpen && (
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[100] bg-surface-solid p-8 flex flex-col">
                  <div className="scanline opacity-10" />
                  <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-2xl font-cyber neon-text">COMMS_LINK</h3>
                        <p className="text-[7px] font-sync text-cyan-500/40">SECURE_ENCRYPTION_ACTIVE</p>
                      </div>
                      <button onClick={() => setChatOpen(false)} className="p-3 hud-panel rounded-xl"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar mb-6 pr-2">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                              <span className="text-[7px] font-cyber text-gray-600 mb-1">{m.username}</span>
                              <div className={`px-6 py-3 rounded-2xl max-w-[80%] font-cyber text-sm ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'bg-cyan-500 text-black rounded-tr-none' : 'hud-panel rounded-tl-none'}`}>
                                  {m.message}
                              </div>
                          </div>
                      ))}
                  </div>
                  
                  <div className="flex gap-3">
                      <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} className="flex-1 hud-panel p-5 rounded-2xl outline-none font-cyber text-sm bg-black/40" placeholder="TYPE_MESSAGE..." />
                      <button onClick={sendChat} className="p-5 btn-cyber btn-primary-neon rounded-2xl"><Send size={20} /></button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
