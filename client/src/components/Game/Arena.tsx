"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, MessageSquare, Send, X, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
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

  // Sounds
  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    win: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.4 })
  };

  useEffect(() => {
    if (!socket || isDemo) return;

    socket.on('playerJoined', (r) => setRoom(r));
    socket.on('tossChoiceLocked', ({ choice }) => setTossChoice(choice));
    
    socket.on('tossResult', (res) => {
        setLastResult({ type: 'TOSS', ...res });
        setGameState('ROLE_SELECT');
        setMyMove(null);
    });

    socket.on('gameStarted', (r) => {
        setRoom(r);
        setGameState('PLAYING');
        setLastResult(null);
    });

    socket.on('updateScore', ({ room, lastResult }) => {
        setRoom(room);
        setLastResult(lastResult);
        setMyMove(null);
        sounds.bat.play();
        setTimer(10);
    });

    socket.on('playerOut', ({ room }) => {
        setRoom(room);
        setLastResult({ type: 'OUT' });
        setMyMove(null);
        sounds.wicket.play();
        setTimer(10);
    });

    socket.on('matchResult', (r) => {
        setRoom(r);
        setGameState('FINISHED');
        if (r.winner === socket.id) {
            confetti({ particleCount: 200, spread: 90 });
            sounds.win.play();
        }
    });

    socket.on('messageReceived', (msg) => {
        setMessages(prev => [...prev, msg]);
    });

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

  // Timer Effect
  useEffect(() => {
    if (gameState === 'PLAYING' && myMove === null) {
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // handleAutoMove(Math.floor(Math.random() * 6) + 1);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [gameState, myMove]);

  const handleMove = (val: number) => {
    if (myMove !== null) return;
    setMyMove(val);

    if (gameState === 'TOSS') {
        socket.emit('sendTossNumber', { roomId: room.roomId, number: val });
    } else if (gameState === 'PLAYING') {
        socket.emit('sendNumber', { roomId: room.roomId, number: val });
    }
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-inter overflow-hidden selection:bg-yellow-500 selection:text-black">
      {/* Premium Navbar */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 glass z-50">
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-2xl transition-all">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <h1 className="text-lg font-black italic gold-text tracking-tighter uppercase">HPL Arena</h1>
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">
                {isDemo ? "Practice Mode" : `Match # ${room?.roomId}`}
            </p>
        </div>
        <button onClick={() => setChatOpen(true)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all relative">
            <MessageSquare size={20} />
            {messages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full relative">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="relative group">
                    <div className="w-36 h-36 rounded-[3rem] bg-yellow-500/5 border-2 border-dashed border-yellow-500/20 animate-spin-slow group-hover:border-yellow-500/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users size={52} className="text-yellow-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-black italic tracking-tighter">WAITING LOBBY</h2>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest leading-relaxed">
                        Match starts once opponent enters <br />
                        <span className="text-yellow-500/80">Share code: {room?.roomId}</span>
                    </p>
                </div>
                <div className="w-full bg-[#111] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 p-4 rounded-3xl border border-white/5 text-2xl font-black tracking-[0.5em] text-center text-gray-300">
                            {room?.roomId}
                        </div>
                        <button className="p-4 bg-yellow-500 text-black rounded-3xl active:scale-95 transition-all">
                            <Zap size={24} />
                        </button>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'TOSS' && (
             <motion.div key="toss" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black italic gold-text tracking-tighter">THE TOSS</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{tossChoice ? "PICK YOUR NUMBER" : "SELECT ODD OR EVEN"}</p>
                </div>

                {!tossChoice ? (
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button onClick={() => handleTossChoice('even')} className="p-8 bg-blue-600 rounded-[2.5rem] font-black text-2xl italic tracking-tighter border-b-8 border-blue-900 active:translate-y-1 active:border-b-0 transition-all">EVEN</button>
                        <button onClick={() => handleTossChoice('odd')} className="p-8 bg-red-600 rounded-[2.5rem] font-black text-2xl italic tracking-tighter border-b-8 border-red-900 active:translate-y-1 active:border-b-0 transition-all">ODD</button>
                    </div>
                ) : (
                    <div className="w-full space-y-8">
                        <div className="text-center font-bold text-gray-400 uppercase tracking-widest text-xs">
                            System Sum Logic: {tossChoice.toUpperCase()} WINS
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {BUTTONS.map(n => (
                                <button key={n} disabled={myMove !== null} onClick={() => handleMove(n)} className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black ${myMove === n ? 'bg-yellow-500 text-black' : 'bg-white/5 disabled:opacity-50'}`}>{n}</button>
                            ))}
                        </div>
                    </div>
                )}
             </motion.div>
          )}

          {gameState === 'ROLE_SELECT' && (
             <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="text-center">
                    <Sparkles className="mx-auto text-yellow-500 mb-4" size={48} />
                    <h2 className="text-3xl font-black italic gold-text">MATCH READY!</h2>
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-2">{lastResult?.winnerName} choosing field...</p>
                </div>
                
                {lastResult?.winnerId === (isDemo ? 'me' : socket?.id) ? (
                    <div className="grid grid-cols-1 gap-4 w-full">
                        <button onClick={() => handleRoleSelect('batting')} className="w-full bg-emerald-500 p-6 rounded-[2rem] font-black text-xl italic text-black flex items-center justify-between">BAT FIRST <ChevronRight /></button>
                        <button onClick={() => handleRoleSelect('bowling')} className="w-full bg-sky-500 p-6 rounded-[2rem] font-black text-xl italic text-black flex items-center justify-between">BOWL FIRST <ChevronRight /></button>
                    </div>
                ) : (
                    <div className="animate-pulse text-gray-600 font-bold italic">Opponent is selecting...</div>
                )}
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                {/* Zomato-style Header Info */}
                <div className="flex justify-between items-end mb-6">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Innings {room?.innings}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black italic tracking-tighter leading-none">{me.score}</span>
                            <span className="text-xs font-bold text-gray-600">RUNS</span>
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                            <Clock size={12} className={timer < 4 ? 'text-red-500' : 'text-gray-600'} />
                            <span className={`text-sm font-black italic ${timer < 4 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>{timer}s</span>
                        </div>
                        <p className="text-[10px] font-black uppercase text-yellow-500">{me.role.toUpperCase()}</p>
                    </div>
                </div>

                {/* Scoreboard Strip */}
                <div className="bg-[#111] p-3 rounded-2xl border border-white/5 flex justify-between items-center px-5 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black">{opp.name[0]}</div>
                        <span className="text-[10px] font-bold text-gray-500">{opp.name}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="text-right">
                            <p className="text-[8px] font-bold text-gray-600 uppercase">Score</p>
                            <p className="text-xs font-black">{opp.score}</p>
                        </div>
                        {room?.target && (
                            <div className="h-6 w-px bg-white/10" />
                        )}
                        {room?.target && (
                            <div className="text-right">
                                <p className="text-[8px] font-bold text-yellow-500 uppercase">Target</p>
                                <p className="text-xs font-black text-yellow-500">{room.target}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Arena Display */}
                <div className="flex-1 bg-[#111] rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-8">
                    <AnimatePresence mode="wait">
                        {myMove ? (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                <div className="text-[10px] font-black text-gray-600 mb-2 tracking-[0.2em]">DECISION LOCKED</div>
                                <div className="w-24 h-24 rounded-3xl bg-yellow-500 text-black flex items-center justify-center text-5xl font-black italic shadow-[0_0_40px_rgba(255,215,0,0.2)]">
                                    {myMove}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <p className="text-6xl font-black opacity-[0.03] select-none italic tracking-tighter">HPL CRICKET</p>
                                <p className="text-[9px] font-bold text-gray-800 uppercase tracking-[0.5em] mt-4">Make Your Move</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Result Overlay */}
                    <AnimatePresence>
                        {lastResult && !myMove && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-10 flex gap-10">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-500">YOU</p>
                                    <p className="text-4xl font-black italic">{room.players.find(p => p.id === (isDemo ? 'me' : socket?.id)).role === 'batsman' ? lastResult.batMove : lastResult.bowlMove}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-500">OPP</p>
                                    <p className="text-4xl font-black italic text-red-500">{room.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)).role === 'batsman' ? lastResult.batMove : lastResult.bowlMove}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="mt-8 space-y-6">
                    <div className="grid grid-cols-6 gap-2">
                        {BUTTONS.map(n => (
                            <button key={n} disabled={myMove !== null} onClick={() => handleMove(n)} className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-black italic transition-all border-b-4 ${myMove === n ? 'bg-yellow-500 text-black border-yellow-700' : 'bg-[#181818] border-black hover:bg-[#222]'}`}>{n}</button>
                        ))}
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'FINISHED' && (
             <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10 text-center">
                <div className="relative">
                    <div className="p-8 bg-yellow-500/10 rounded-[3rem] border border-yellow-500/20">
                        <Trophy size={110} className="text-yellow-500" />
                    </div>
                </div>
                <div>
                    <h2 className="text-5xl font-black italic gold-text tracking-tighter uppercase leading-tight mb-2">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "Match Won!" : "Hard Luck!"}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Tournament Final Results</p>
                </div>
                <div className="w-full bg-[#111] p-6 rounded-[2.5rem] border border-white/5">
                    <div className="flex justify-between items-center px-10">
                        <div className="text-center">
                            <p className="text-3xl font-black">{me.score}</p>
                            <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">You</p>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-3xl font-black">{opp.score}</p>
                            <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Opponent</p>
                        </div>
                    </div>
                </div>
                <button onClick={onExit} className="w-full bg-yellow-500 text-black py-5 rounded-[2rem] font-black text-lg tracking-tighter italic">FINISH & EXIT</button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Drawers */}
      <AnimatePresence>
          {chatOpen && (
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[60] bg-black/90 p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black italic gold-text">MATCH CHAT</h3>
                      <button onClick={() => setChatOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex flex-col ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-black text-gray-600 mb-1 uppercase tracking-widest">{m.username}</span>
                              <div className={`p-4 rounded-[1.5rem] max-w-[80%] font-bold text-sm ${m.senderId === (isDemo ? 'me' : socket?.id) ? 'bg-yellow-500 text-black rounded-tr-none' : 'bg-white/10 rounded-tl-none text-gray-200'}`}>
                                  {m.message}
                              </div>
                          </div>
                      ))}
                      {messages.length === 0 && <p className="text-center text-gray-700 text-xs mt-20 italic">No messages yet. Say hello!</p>}
                  </div>
                  <div className="flex gap-2">
                      <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} className="flex-1 bg-white/5 p-4 rounded-3xl outline-none border border-white/10" placeholder="Type message..." />
                      <button onClick={sendChat} className="p-4 bg-yellow-500 text-black rounded-3xl"><Send size={24} /></button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
