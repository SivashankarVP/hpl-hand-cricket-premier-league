"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Users, User as UserIcon, Zap, Sparkles, AlertCircle, Share2, Copy } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
import confetti from 'canvas-confetti';
import { Howl } from 'howler';

const BUTTONS = [1, 2, 3, 4, 5, 6];

export default function Arena({ room: initialRoom, username, isDemo, onExit }) {
  const socket = useSocket();
  const { user, setStats } = useStore();
  
  const [room, setRoom] = useState(initialRoom);
  const [gameState, setGameState] = useState(initialRoom?.gameState || (isDemo ? 'PLAYING' : 'LOBBY'));
  const [myMove, setMyMove] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [timer, setTimer] = useState(10);
  const [isCopied, setIsCopied] = useState(false);

  // Sound effects
  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    crowd: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.3 })
  };

  useEffect(() => {
    if (isDemo && gameState === 'PLAYING' && !room) {
      // Mock room for demo
      setRoom({
        roomId: 'DEMO',
        players: [
          { id: 'me', name: username, score: 0, role: 'batsman' },
          { id: 'ai', name: 'Bot Bravo', score: 0, role: 'bowler' }
        ],
        innings: 1,
        history: [],
        gameState: 'PLAYING'
      });
    }
  }, [isDemo, gameState]);

  useEffect(() => {
    if (!socket || isDemo) return;

    const handleRoomUpdate = (updatedRoom) => {
        setRoom(updatedRoom);
        setGameState(updatedRoom.gameState);
    };

    socket.on('playerJoined', handleRoomUpdate);
    socket.on('gameStarted', handleRoomUpdate);
    socket.on('moveResult', ({ room, lastResult }) => {
        setRoom(room);
        setLastResult(lastResult);
        setMyMove(null);
        sounds.bat.play();
    });
    socket.on('inningsOver', (room) => {
        setRoom(room);
        setMyMove(null);
        setLastResult(null);
        sounds.wicket.play();
    });
    socket.on('gameOver', (room) => {
        setRoom(room);
        setGameState('FINISHED');
        if (room.winner === socket.id) {
            confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
            sounds.crowd.play();
        }
    });
    socket.on('tossResult', (res) => {
        setLastResult({ type: 'TOSS', ...res });
        if (res.winnerId === socket.id) setGameState('ROLE_SELECT');
    });
    socket.on('reactionReceived', ({ emoji, senderId }) => {
        setReaction({ emoji, senderId });
        setTimeout(() => setReaction(null), 2000);
    });

    return () => {
        socket.off('playerJoined');
        socket.off('gameStarted');
        socket.off('moveResult');
        socket.off('inningsOver');
        socket.off('gameOver');
        socket.off('tossResult');
        socket.off('reactionReceived');
    };
  }, [socket, isDemo]);

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) handleMove(num);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myMove, gameState]);

  // Demo AI Runner
  useEffect(() => {
    if (isDemo && myMove !== null && gameState === 'PLAYING') {
        const timeout = setTimeout(() => {
            const aiMove = Math.floor(Math.random() * 6) + 1;
            processDemoMove(aiMove);
        }, 1000);
        return () => clearTimeout(timeout);
    }
  }, [myMove, isDemo]);

  const handleMove = (val: number) => {
    if (myMove !== null || gameState !== 'PLAYING') return;
    setMyMove(val);
    if (!isDemo) socket.emit('makeMove', { roomId: room.roomId, move: val });
  };

  const processDemoMove = (aiMove: number) => {
      // (Similar to previous demo logic but updating room state)
      const newRoom = { ...room };
      const me = newRoom.players[0];
      const ai = newRoom.players[1];
      const batsman = me.role === 'batsman' ? me : ai;
      const bowler = me.role === 'bowler' ? me : ai;
      const batMove = me.role === 'batsman' ? myMove : aiMove;
      const bowlMove = me.role === 'bowler' ? myMove : aiMove;

      if (batMove === bowlMove) {
          sounds.wicket.play();
          if (newRoom.innings === 1) {
              newRoom.innings = 2;
              newRoom.target = batsman.score + 1;
              newRoom.players.forEach(p => p.role = (p.role === 'batsman' ? 'bowler' : 'batsman'));
          } else {
              setGameState('FINISHED');
              newRoom.winner = bowler.id;
          }
      } else {
          sounds.bat.play();
          batsman.score += batMove;
          if (newRoom.innings === 2 && batsman.score >= newRoom.target) {
              setGameState('FINISHED');
              newRoom.winner = batsman.id;
          }
      }
      setRoom(newRoom);
      setLastResult({ batMove, bowlMove, batsmanName: batsman.name });
      setMyMove(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room?.roomId}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const me = room?.players.find(p => p.id === (isDemo ? 'me' : socket?.id)) || { name: username, score: 0, role: 'batsman' };
  const opp = room?.players.find(p => p.id !== (isDemo ? 'me' : socket?.id)) || { name: isDemo ? 'Bot Bravo' : '...', score: 0, role: 'bowler' };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      {/* Dynamic Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 glass z-50">
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-2xl transition-all">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="text-center">
            <h1 className="text-xl font-black italic gold-text leading-tight tracking-tighter">HPL ARENA</h1>
            <div className="flex items-center gap-2 justify-center">
                <span className={`w-1.5 h-1.5 rounded-full ${isDemo ? 'bg-orange-500' : 'bg-green-500'} animate-pulse`} />
                <p className="text-[9px] uppercase tracking-widest font-bold opacity-60">
                    {isDemo ? "OFFLINE DEMO" : `LIVE: ${room?.roomId}`}
                </p>
            </div>
        </div>
        <div className="flex gap-2">
            {!isDemo && room?.gameState === 'LOBBY' && (
                <button onClick={copyLink} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    {isCopied ? <Sparkles size={18} className="text-yellow-500" /> : <Share2 size={18} />}
                </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Users size={16} />
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 space-y-4 max-w-2xl mx-auto w-full relative">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
             <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-blue-500/10 border-2 border-dashed border-blue-500/30 animate-spin-slow" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users size={48} className="text-blue-500" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black italic tracking-tight">WAITING FOR CHAMPIONS</h2>
                    <p className="text-gray-500 text-sm max-w-xs">Match will start automatically once the opponent joins the arena.</p>
                </div>
                <div className="w-full glass p-6 rounded-[2.5rem] border border-white/10 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center text-gray-500">Share match code</p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5 text-2xl font-black tracking-widest text-yellow-500 text-center">
                            {room?.roomId}
                        </div>
                        <button onClick={copyLink} className="p-4 bg-yellow-500 text-blue-950 rounded-2xl hover:bg-yellow-400 transition-all font-black">
                            <Copy size={24} />
                        </button>
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
             <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                {/* Visual Scoreboard (Premium) */}
                <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className={`glass p-5 rounded-[2rem] border transition-all ${me.role === 'batsman' ? 'border-yellow-500/30 ring-1 ring-yellow-500/20' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${me.role === 'batsman' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">YOU ({me.role})</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black italic tracking-tighter">{me.score}</span>
                            <span className="text-xs font-bold opacity-40">RUNS</span>
                        </div>
                    </div>
                    <div className={`glass p-5 rounded-[2rem] border text-right transition-all ${opp.role === 'batsman' ? 'border-yellow-500/30' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2 mb-2 justify-end">
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">{opp.name} ({opp.role})</p>
                            <span className={`w-2 h-2 rounded-full ${opp.role === 'batsman' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="flex items-baseline justify-end gap-1">
                            <span className="text-5xl font-black italic tracking-tighter">{opp.score}</span>
                        </div>
                    </div>
                </div>

                {room?.target && (
                    <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-3xl p-3 flex justify-between items-center px-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Target Chase</p>
                        <p className="text-sm font-black italic text-white">{room.target} Runs</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">{Math.max(0, room.target - me.score)} Left</p>
                    </div>
                )}

                {/* Match Canvas */}
                <div className="flex-1 glass rounded-[3rem] border border-white/10 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-full flex justify-between items-center px-6 z-10">
                        <div className="flex flex-col items-center gap-3">
                            <motion.div animate={myMove ? { scale: [1, 1.1, 1] } : {}} className={`w-20 h-20 rounded-3xl ${myMove ? 'bg-yellow-500 text-blue-950 shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'bg-white/5 border border-white/10'} flex items-center justify-center transition-all duration-300`}>
                                <UserIcon size={32} />
                            </motion.div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {myMove ? 'Decision Made' : 'Your Turn'}
                            </p>
                        </div>

                        <div className="text-center font-black italic text-2xl opacity-10 tracking-[0.5em]">ARENA</div>

                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300`}>
                                <UserIcon size={32} className="opacity-40" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">Waiting</p>
                        </div>
                    </div>

                    {/* Result Center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {lastResult ? (
                                <motion.div key="res" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-5xl font-black italic gold-text drop-shadow-lg">{lastResult.batMove}</p>
                                            <p className="text-[8px] font-black uppercase text-gray-500">Bat</p>
                                        </div>
                                        <div className="w-0.5 h-12 bg-white/10 rotate-12" />
                                        <div className="text-center">
                                            <p className="text-5xl font-black italic text-red-500 drop-shadow-lg">{lastResult.bowlMove}</p>
                                            <p className="text-[8px] font-black uppercase text-gray-500">Bowl</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-8xl font-black opacity-[0.02] italic tracking-tighter select-none">HPL</div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Reactions */}
                    <AnimatePresence>
                        {reaction && (
                            <motion.div initial={{ y: 20, opacity: 0, scale: 0 }} animate={{ y: -50, opacity: 1, scale: 2 }} exit={{ opacity: 0 }} className="absolute text-5xl z-20">
                                {reaction.emoji}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls Area */}
                <div className="mt-6 space-y-6">
                    <div className="grid grid-cols-6 gap-2 px-2">
                        {BUTTONS.map(num => (
                            <button 
                                key={num}
                                disabled={myMove !== null}
                                onClick={() => handleMove(num)}
                                className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-black italic transition-all transform active:scale-90 border-b-4 
                                    ${myMove === num 
                                        ? 'bg-yellow-500 text-blue-950 border-yellow-700' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                                    } disabled:opacity-50`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-center gap-4 p-2">
                        {['🏏', '🔥', '😂', '💯', '👊', '🧤'].map(e => (
                            <button 
                                key={e}
                                onClick={() => {
                                    if (isDemo) { setReaction({ emoji: e, senderId: 'me' }); setTimeout(() => setReaction(null), 1500); }
                                    else socket.emit('sendReaction', { roomId: room.roomId, emoji: e });
                                }}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-xl"
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>
             </motion.div>
          )}

          {gameState === 'FINISHED' && (
             <motion.div key="finish" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
                <div className="relative">
                    <Trophy size={140} className="text-yellow-500 drop-shadow-[0_0_30px_rgba(255,215,0,0.4)]" />
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -inset-10 border-2 border-dashed border-yellow-500/10 rounded-full" />
                </div>
                <div>
                   <h2 className="text-5xl font-black italic gold-text tracking-tighter mb-2">
                        {room?.winner === (isDemo ? 'me' : socket?.id) ? "CHAMPION!" : "WELL PLAYED!"}
                   </h2>
                   <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs opacity-60">Match Concluded</p>
                </div>
                
                <div className="w-full glass p-8 rounded-[3rem] border border-white/10 space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-500">Final Summary</p>
                    <div className="flex justify-center items-center gap-8">
                        <div>
                            <p className="text-3xl font-black">{me.score}</p>
                            <p className="text-[8px] font-bold opacity-40">YOU</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <p className="text-3xl font-black">{opp.score}</p>
                            <p className="text-[8px] font-bold opacity-40">{opp.name}</p>
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <button onClick={onExit} className="w-full bg-yellow-500 text-blue-950 py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-yellow-500/10 active:scale-95 transition-all">
                        PLAY AGAIN
                    </button>
                    <button onClick={onExit} className="w-full bg-white/10 py-5 rounded-[2rem] font-black text-white hover:bg-white/20 transition-all">
                        HOME
                    </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Drawer */}
      {gameState === 'PLAYING' && (
          <div className="px-6 py-4 border-t border-white/5 glass">
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {room?.history?.slice(-12).reverse().map((h, i) => (
                      <div key={i} className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center border
                        ${h.batMove === h.bowlMove ? 'bg-red-500/20 border-red-500/30' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                        <span className="text-xs font-black italic leading-none">{h.batMove === h.bowlMove ? 'W' : h.batMove}</span>
                      </div>
                  ))}
                  {(!room?.history || room.history.length === 0) && (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Match History starting...</p>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}
