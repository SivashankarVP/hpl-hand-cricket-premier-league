"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Send, Users, User, Clock, MessageSquare, History, Play, CheckCircle2, AlertTriangle, Info, Smile, Frown, Flame, Heart, HeartPulse, Sparkles, Star, Zap } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import confetti from 'canvas-confetti';
import { Howl } from 'howler';

const BUTTONS = [1, 2, 3, 4, 5, 6];

export default function Arena({ room, username, isDemo, onExit }) {
  const socket = useSocket();
  const [gameState, setGameState] = useState(room?.status || (isDemo ? 'PLAYING' : 'LOBBY'));
  const [players, setPlayers] = useState(room?.players || [{ id: 'me', name: username, score: 0, role: null }]);
  const [innings, setInnings] = useState(room?.innings || 1);
  const [target, setTarget] = useState(room?.target || null);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [myMove, setMyMove] = useState(null);
  const [opponentMoved, setOpponentMoved] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [winner, setWinner] = useState(null);
  const [tossResult, setTossResult] = useState(null);
  const [timer, setTimer] = useState(10);
  const timerRef = useRef(null);

  // Sound effects (placeholder URLs or logic)
  const sounds = {
    bat: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a1766a.mp3'], volume: 0.5 }),
    wicket: new Howl({ src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_34e107d39a.mp3'], volume: 0.6 }),
    crowd: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/01/26/audio_2267677b10.mp3'], volume: 0.3 }),
    click: new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/24/audio_b2a382dec0.mp3'], volume: 0.2 })
  };

  useEffect(() => {
    if (isDemo && gameState === 'PLAYING' && players[0].role === null) {
      // Setup demo Roles
      const newPlayers = [...players];
      newPlayers[0].role = 'batsman';
      newPlayers.push({ id: 'ai', name: 'Bot Bravo', score: 0, role: 'bowler' });
      setPlayers(newPlayers);
    }
  }, [isDemo, gameState]);

  useEffect(() => {
    if (!socket || isDemo) return;

    socket.on('tossStarted', ({ players }) => {
      setPlayers(players);
      setGameState('TOSS');
    });

    socket.on('tossResult', ({ winnerId, winnerName, result }) => {
      setTossResult({ winnerId, winnerName, result });
      if (winnerId === socket.id) {
         setGameState('ROLE_SELECT');
      }
    });

    socket.on('gameStarted', ({ room }) => {
      setPlayers(room.players);
      setInnings(room.innings);
      setGameState('PLAYING');
      setHistory([]);
      setTarget(null);
    });

    socket.on('moveResult', ({ room, lastResult }) => {
      updateGameState(room, lastResult);
      sounds.bat.play();
    });

    socket.on('inningsOver', ({ room, message }) => {
      setPlayers(room.players);
      setInnings(room.innings);
      setTarget(room.target);
      setLastMove(null);
      setMyMove(null);
      setOpponentMoved(false);
      sounds.wicket.play();
    });

    socket.on('gameOver', ({ room }) => {
      setPlayers(room.players);
      setWinner(room.winner);
      setGameState('FINISHED');
      if (room.winner === socket.id) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        sounds.crowd.play();
      }
    });

    socket.on('reactionReceived', ({ emoji, senderId }) => {
       setReaction({ emoji, senderId });
       setTimeout(() => setReaction(null), 2000);
    });

    return () => {
      socket.off('tossStarted');
      socket.off('tossResult');
      socket.off('gameStarted');
      socket.off('moveResult');
      socket.off('inningsOver');
      socket.off('gameOver');
      socket.off('reactionReceived');
    };
  }, [socket, isDemo]);

  // Demo Logic
  useEffect(() => {
    if (isDemo && myMove !== null && gameState === 'PLAYING') {
      // Simulate AI Move
      const timer = setTimeout(() => {
         const aiMove = Math.floor(Math.random() * 6) + 1;
         processDemoMove(aiMove);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [myMove, isDemo, gameState]);

  const updateGameState = (room, lastResult) => {
    setPlayers(room.players);
    setLastMove(lastResult);
    setHistory([...history, lastResult]);
    setMyMove(null);
    setOpponentMoved(false);
  };

  const processDemoMove = (aiMove) => {
     const me = players[0];
     const ai = players[1];
     const myVal = myMove;
     
     const batsman = me.role === 'batsman' ? me : ai;
     const bowler = me.role === 'bowler' ? me : ai;
     const batMove = me.role === 'batsman' ? myVal : aiMove;
     const bowlMove = me.role === 'bowler' ? myVal : aiMove;

     const resultEntry = { batMove, bowlMove, batsmanName: batsman.name };
     
     if (batMove === bowlMove) {
        sounds.wicket.play();
        if (innings === 1) {
           setInnings(2);
           setTarget(batsman.score + 1);
           const newPlayers = players.map(p => ({
              ...p,
              role: p.role === 'batsman' ? 'bowler' : 'batsman'
           }));
           setPlayers(newPlayers);
           setMyMove(null);
        } else {
           setGameState('FINISHED');
           const finalWinner = batsman.score >= target ? batsman.id : bowler.id;
           setWinner(finalWinner);
           if (finalWinner === 'me') {
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              sounds.crowd.play();
           }
        }
     } else {
        sounds.bat.play();
        const newPlayers = players.map(p => {
           if (p.role === 'batsman') return { ...p, score: p.score + batMove };
           return p;
        });
        setPlayers(newPlayers);
        
        // Target check
        if (innings === 2) {
           const currentBatsman = newPlayers.find(p => p.role === 'batsman');
           if (currentBatsman.score >= target) {
              setGameState('FINISHED');
              setWinner(currentBatsman.id);
              if (currentBatsman.id === 'me') {
                 confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                 sounds.crowd.play();
              }
           }
        }
     }
     
     setLastMove(resultEntry);
     setHistory([...history, resultEntry]);
     setMyMove(null);
  };

  const handleToss = (choice) => {
    sounds.click.play();
    socket.emit('tossChoice', { roomId: room.roomId, choice });
  };

  const handleRoleSelect = (role) => {
    sounds.click.play();
    socket.emit('selectRole', { roomId: room.roomId, role });
  };

  const handleMove = (val) => {
    if (myMove !== null) return;
    sounds.click.play();
    setMyMove(val);
    if (!isDemo) {
      socket.emit('makeMove', { roomId: room.roomId, move: val });
    }
  };

  const sendEmoji = (emoji) => {
    if (!socket || isDemo) return;
    socket.emit('sendReaction', { roomId: room.roomId, emoji });
    setReaction({ emoji, senderId: 'me' });
    setTimeout(() => setReaction(null), 2000);
  };

  const me = players.find(p => p.id === (isDemo ? 'me' : socket?.id));
  const opp = players.find(p => p.id !== (isDemo ? 'me' : socket?.id));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-inter overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 glass z-40">
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-2xl transition-all">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="text-center">
            <h1 className="text-xl font-black italic tracking-tighter gold-text leading-tight">HPL ARENA</h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold -mt-0.5">
               {isDemo ? "OFFLINE MATCH" : `ROOM: ${room?.roomId}`}
            </p>
        </div>
        <div className="p-2 flex gap-2">
           <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
              <Sparkles size={16} />
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 space-y-4 max-w-2xl mx-auto w-full relative">
        <AnimatePresence mode="wait">
          {gameState === 'LOBBY' && (
            <motion.div 
               key="lobby"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="flex-1 flex flex-col items-center justify-center space-y-8"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-blue-500/10 border-4 border-dashed border-blue-500/30 animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <Users size={48} className="text-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black tracking-tight italic">WAITING FOR OPPONENT</h2>
                 <p className="text-gray-500 text-sm">Share the room code or link to start the match</p>
              </div>
              <div className="glass w-full p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
                 <div className="bg-white/5 w-full p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <code className="text-2xl font-black tracking-widest text-yellow-500">{room?.roomId}</code>
                    <button 
                      onClick={() => {
                         navigator.clipboard.writeText(room?.roomId);
                         alert("Room Code Copied!");
                      }}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                    >
                       <Zap size={18} />
                    </button>
                 </div>
                 <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">INVITE LINK (Coming Soon)</p>
              </div>
            </motion.div>
          )}

          {gameState === 'TOSS' && (
            <motion.div 
              key="toss"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center space-y-8"
            >
               <div className="text-center space-y-2">
                 <h2 className="text-3xl font-black italic gold-text">TIME FOR TOSS!</h2>
                 <p className="text-gray-400 text-sm">Choose Head or Tails</p>
               </div>
               
               <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                  <button 
                    onClick={() => handleToss('heads')}
                    className="aspect-square bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex flex-col items-center justify-center gap-4 border-b-4 border-blue-900 shadow-xl active:translate-y-1 active:border-b-0 transition-all group"
                  >
                     <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold group-hover:scale-110 transition-transform">H</div>
                     <span className="font-black italic tracking-widest text-lg">HEADS</span>
                  </button>
                  <button 
                    onClick={() => handleToss('tails')}
                    className="aspect-square bg-gradient-to-br from-red-600 to-red-800 rounded-3xl flex flex-col items-center justify-center gap-4 border-b-4 border-red-900 shadow-xl active:translate-y-1 active:border-b-0 transition-all group"
                  >
                     <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold group-hover:scale-110 transition-transform">T</div>
                     <span className="font-black italic tracking-widest text-lg">TAILS</span>
                  </button>
               </div>

               {tossResult && (
                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-yellow-500 font-black italic">{tossResult.winnerName} WON THE TOSS!</p>
                 </motion.div>
               )}
            </motion.div>
          )}

          {gameState === 'ROLE_SELECT' && (
             <motion.div 
               key="role"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex-1 flex flex-col items-center justify-center space-y-8"
             >
                <div className="text-center space-y-2">
                 <h2 className="text-3xl font-black italic gold-text tracking-tight">YOU WON THE TOSS!</h2>
                 <p className="text-gray-400 text-sm">What would you like to do?</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 w-full">
                   <button 
                     onClick={() => handleRoleSelect('batting')}
                     className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 p-6 rounded-3xl flex items-center justify-between border-b-4 border-emerald-900 group active:translate-y-1 active:border-b-0"
                   >
                     <div className="space-y-1 text-left">
                        <p className="font-black italic text-xl">BATTING</p>
                        <p className="text-xs text-white/70">Score big runs and set a total</p>
                     </div>
                     <Zap size={32} />
                   </button>
                   <button 
                     onClick={() => handleRoleSelect('bowling')}
                     className="w-full bg-gradient-to-r from-sky-500 to-sky-700 p-6 rounded-3xl flex items-center justify-between border-b-4 border-sky-900 group active:translate-y-1 active:border-b-0"
                   >
                     <div className="space-y-1 text-left">
                        <p className="font-black italic text-xl">BOWLING</p>
                        <p className="text-xs text-white/70">Stop them early and chase it down</p>
                     </div>
                     <Users size={32} />
                   </button>
                </div>
             </motion.div>
          )}

          {gameState === 'PLAYING' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              {/* Scoreboard */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                 <div className="glass p-4 rounded-3xl border border-white/5 space-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                       {me?.role === 'batsman' ? <Zap size={40} /> : <Users size={40} />}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-[#FFD700] font-bold">YOU ({me?.role})</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-4xl font-black italic tracking-tighter">{me?.score}</span>
                       {me?.role === 'batsman' && <span className="text-xs font-bold text-gray-500 animate-pulse">RUNS</span>}
                    </div>
                 </div>
                 <div className="glass p-4 rounded-3xl border border-white/5 space-y-1 text-right">
                    <p className="text-[10px] uppercase tracking-widest text-[#DC143C] font-bold">{opp?.name} ({opp?.role})</p>
                    <div className="flex items-baseline justify-end gap-1">
                       <span className="text-4xl font-black italic tracking-tighter">{opp?.score}</span>
                    </div>
                 </div>
              </div>

              {target && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
                   <p className="text-xs font-bold tracking-widest text-yellow-500 uppercase">
                      TARGET: {target} • NEEDED: {Math.max(0, target - me.score)}
                   </p>
                </div>
              )}

              {/* Game View */}
              <div className="flex-1 glass rounded-3xl border border-white/10 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                 {/* Visual Battle */}
                 <div className="w-full flex justify-between items-center mb-8 px-4">
                    <div className="flex flex-col items-center gap-2">
                       <div className={`p-4 rounded-full ${myMove ? 'bg-blue-500' : 'bg-white/5'} border border-white/10 transition-all duration-300`}>
                          <User size={32} />
                       </div>
                       <p className="text-xs font-bold text-gray-500">{myMove !== null ? 'READY' : 'WAITING'}</p>
                    </div>

                    <div className="text-center font-black italic text-4xl text-gray-800 tracking-tighter">VS</div>

                    <div className="flex flex-col items-center gap-2">
                       <div className={`p-4 rounded-full ${opponentMoved ? 'bg-red-500' : 'bg-white/5'} border border-white/10 transition-all duration-300`}>
                          <User size={32} />
                       </div>
                       <p className="text-xs font-bold text-gray-500 tracking-widest">{isDemo ? 'AI' : 'OPPONENT'}</p>
                    </div>
                 </div>

                 {/* Last Call */}
                 <div className="h-24 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                       {lastMove ? (
                         <motion.div 
                           key="move" 
                           initial={{ scale: 0.5, opacity: 0 }} 
                           animate={{ scale: 1, opacity: 1 }} 
                           className="flex items-center gap-8"
                         >
                            <div className="flex flex-col items-center">
                               <span className="text-5xl font-black gold-text italic">{lastMove.batMove}</span>
                               <span className="text-[10px] font-bold text-gray-500 uppercase">BAT</span>
                            </div>
                            <div className="text-2xl font-black text-white/20 italic">|</div>
                            <div className="flex flex-col items-center">
                               <span className="text-5xl font-black text-red-500 italic">{lastMove.bowlMove}</span>
                               <span className="text-[10px] font-bold text-gray-500 uppercase">BOWL</span>
                            </div>
                         </motion.div>
                       ) : (
                         <div className="text-gray-700 italic font-black text-lg tracking-widest animate-pulse uppercase">Make Your Move</div>
                       )}
                    </AnimatePresence>
                 </div>

                 {/* Reactions Overlay */}
                 <AnimatePresence>
                    {reaction && (
                      <motion.div 
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1.5, y: -20 }}
                        exit={{ opacity: 0 }}
                        className={`absolute ${reaction.senderId === 'me' ? 'left-10' : 'right-10'} bottom-1/2 text-4xl pointer-events-none`}
                      >
                         {reaction.emoji}
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="mt-6 flex flex-col gap-6">
                 <div className="grid grid-cols-6 gap-2">
                    {BUTTONS.map(num => (
                      <button 
                        key={num}
                        disabled={myMove !== null}
                        onClick={() => handleMove(num)}
                        className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black italic transition-all transform active:scale-95 border-b-4 
                          ${myMove === num 
                            ? 'bg-yellow-500 text-blue-950 scale-105 border-yellow-700' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white active:bg-yellow-500/20'
                          } disabled:opacity-50`}
                      >
                        {num}
                      </button>
                    ))}
                 </div>

                 <div className="flex justify-center gap-3">
                    {['🔥', '😎', '😭', '🏏', '😂', '💯'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => sendEmoji(emoji)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {gameState === 'FINISHED' && (
            <motion.div 
              key="finished"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center space-y-8"
            >
               <div className="relative">
                 <Trophy size={120} className="text-yellow-500 drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]" />
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-8 border border-dashed border-yellow-500/20 rounded-full"
                 />
               </div>

               <div className="text-center space-y-2">
                  <h2 className="text-4xl font-black italic tracking-tighter">
                     {winner === (isDemo ? 'me' : socket?.id) ? "YOU WON!" : "MATCH OVER"}
                  </h2>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                     Final Score: {me?.score} - {opp?.score}
                  </p>
               </div>

               <div className="w-full space-y-4">
                  <button 
                    onClick={() => onExit()}
                    className="w-full bg-yellow-500 text-blue-950 font-black py-4 rounded-3xl hover:bg-yellow-400 transition-all active:scale-95"
                  >
                     PLAY AGAIN
                  </button>
                  <button 
                    onClick={onExit}
                    className="w-full bg-white/10 py-4 rounded-3xl font-black border border-white/5 hover:bg-white/20 transition-all"
                  >
                     GO HOME
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ball History Drawer (Mini) */}
      {gameState === 'PLAYING' && (
        <div className="p-4 bg-white/5 border-t border-white/5">
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {history.slice(-10).map((h, i) => (
                <div key={i} className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black italic border
                   ${h.batMove === h.bowlMove ? 'bg-red-500 border-red-700' : 'bg-emerald-500 border-emerald-700'}`}>
                   {h.batMove === h.bowlMove ? 'W' : h.batMove}
                </div>
              ))}
              {history.length === 0 && <p className="text-[10px] uppercase text-gray-600 font-bold tracking-widest">Innings {innings} History...</p>}
           </div>
        </div>
      )}
      
    </div>
  );
}
