"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, Info, ChevronRight, Moon, Sun, 
  User as UserIcon, LogOut, Medal, Zap, 
  ShieldCheck, Gamepad2, Settings2, Activity, 
  Cpu, Globe, Signal, Users, Target, Clock
} from 'lucide-react';
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

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) setRoomCode(roomParam.toUpperCase());

    if (!socket) return;
    socket.on('roomCreated', (room) => router.push(`/room/${room.roomId}`));
    socket.on('error', (msg) => { setError(msg); setTimeout(() => setError(""), 3000); });
    socket.on('userSynced', (dbUser) => setUser(dbUser));
    return () => { socket.off('roomCreated'); socket.off('error'); socket.off('userSynced'); };
  }, [socket, searchParams]);

  const handleStartGame = (mode: 'create' | 'join' | 'bot') => {
    let finalUsername = usernameInput.trim();
    if (!finalUsername) {
      finalUsername = `PLAYER_${Math.floor(Math.random() * 9000) + 1000}`;
      setUsernameInput(finalUsername);
    }
    if (!user || user.username !== finalUsername) {
        setUser({ username: finalUsername, avatar: '🏏' });
    }

    const payload = { 
        username: finalUsername, 
        matchMode, 
        maxOvers: matchMode === 'OVERS' ? oversConfig : 0, 
        maxWickets: matchMode === 'TEST' ? 10 : 1 
    };

    if (mode === 'create') socket.emit('createRoom', payload);
    else if (mode === 'join') {
        if (!roomCode) return setError("ROOM CODE REQUIRED");
        router.push(`/room/${roomCode.toUpperCase()}`);
    } else if (mode === 'bot') {
        socket.emit('createBotRoom', { ...payload, difficulty });
    }
  };

  return (
    <div className="broadcast-layout">
      {/* 📡 HEADER */}
      <header className="layout-header">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent-primary rounded-lg flex items-center justify-center">
            <Trophy className="text-black" size={28} />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-none text-gradient">HPL PREMIER</h1>
            <div className="flex items-center gap-2">
              <span className="badge-live">LIVE</span>
              <span className="text-[10px] text-foreground-muted font-bold tracking-widest uppercase">Global Server v2.4</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8 px-8 border-x border-glass-border">
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted uppercase font-bold">Active Rooms</p>
              <p className="font-display text-xl text-accent-secondary">124</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted uppercase font-bold">Online Players</p>
              <p className="font-display text-xl text-accent-primary">2,841</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <button onClick={logout} className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center hover:bg-accent-danger/20 text-accent-danger transition-colors">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 📊 LEFT SIDEBAR: PROFILE & STATS */}
      <aside className="layout-sidebar-left no-scrollbar">
        <section className="card-premium">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center text-4xl border border-glass-border">
              {user?.avatar || '👤'}
            </div>
            <div>
              <p className="text-[10px] text-accent-primary font-bold uppercase tracking-widest">Player Profile</p>
              <h2 className="text-2xl font-display">{user?.username || 'GUEST_USER'}</h2>
            </div>
          </div>

          {!user ? (
            <div className="space-y-4">
              <p className="text-xs text-foreground-muted">Enter your handle to start competing in the premier league.</p>
              <input 
                type="text" 
                placeholder="USERNAME"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                className="input-premium font-display text-xl tracking-widest"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-box">
                <p className="text-[9px] text-foreground-muted font-bold uppercase">Matches</p>
                <p className="text-2xl font-display">{user.stats?.matchesPlayed || 0}</p>
              </div>
              <div className="stat-box">
                <p className="text-[9px] text-foreground-muted font-bold uppercase">Wins</p>
                <p className="text-2xl font-display text-accent-secondary">{user.stats?.wins || 0}</p>
              </div>
              <div className="stat-box col-span-2">
                <p className="text-[9px] text-foreground-muted font-bold uppercase">Win Rate</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-display">
                    {user.stats?.matchesPlayed 
                      ? ((user.stats.wins / user.stats.matchesPlayed) * 100).toFixed(0) 
                      : '0'}%
                  </p>
                  <div className="flex-1 h-2 bg-surface-3 rounded-full mb-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${user.stats?.matchesPlayed ? (user.stats.wins / user.stats.matchesPlayed) * 100 : 0}%` }}
                      className="height-full bg-accent-secondary h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card-premium">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Medal size={14} className="text-accent-primary" /> Achievements
          </h3>
          <div className="space-y-3">
            {[
              { icon: <Zap size={12}/>, title: 'Century Maker', desc: 'Score 100 runs in a match' },
              { icon: <Target size={12}/>, title: 'Deadly Bowler', desc: 'Take 5 wickets in an over' },
              { icon: <ShieldCheck size={12}/>, title: 'Veteran', desc: 'Play 50 matches' },
            ].map((ach, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help">
                <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center text-accent-primary">
                  {ach.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase">{ach.title}</p>
                  <p className="text-[8px] text-foreground-muted">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {/* 🏏 MAIN CONTENT: MATCH CONTROLS */}
      <main className="layout-main no-scrollbar">
        <section className="card-premium flex-1 flex flex-col justify-center p-12 text-center bg-gradient-to-b from-surface-2 to-surface-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto w-full space-y-12"
          >
            <div>
              <h2 className="text-6xl font-display mb-2">READY FOR THE NEXT <span className="text-accent-primary">INNINGS?</span></h2>
              <p className="text-foreground-muted">Select your match protocol and enter the arena.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(['SINGLE_WICKET', 'OVERS', 'TEST'] as const).map(m => (
                <button 
                  key={m} 
                  onClick={() => setMatchMode(m)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    matchMode === m 
                      ? 'border-accent-primary bg-accent-primary/5 text-accent-primary' 
                      : 'border-glass-border bg-surface-2 text-foreground-muted hover:border-foreground-muted'
                  }`}
                >
                  {m === 'SINGLE_WICKET' && <Target size={32} />}
                  {m === 'OVERS' && <Clock size={32} />}
                  {m === 'TEST' && <ShieldCheck size={32} />}
                  <span className="font-display text-xl">{m.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {matchMode === 'OVERS' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-center items-center gap-6 p-6 rounded-2xl bg-surface-2 border border-glass-border">
                <span className="text-sm font-bold uppercase tracking-widest text-foreground-muted">Match Length</span>
                <div className="flex gap-3">
                  {[2, 5, 10, 20].map(ov => (
                    <button 
                      key={ov} 
                      onClick={() => setOversConfig(ov)} 
                      className={`w-14 h-14 rounded-xl font-display text-2xl transition-all border-2 ${
                        oversConfig === ov ? 'bg-accent-primary text-black border-accent-primary' : 'bg-surface-3 text-foreground-muted border-glass-border hover:border-foreground-muted'
                      }`}
                    >
                      {ov}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-foreground-muted">Overs</span>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => handleStartGame('create')}
                className="btn-action flex items-center justify-center gap-4"
              >
                <Zap size={24} /> Create Realm
              </button>
              
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="ENTER REALM CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="input-premium font-display text-2xl tracking-[0.2em] h-full pr-32"
                />
                <button 
                  onClick={() => handleStartGame('join')}
                  className="absolute right-2 top-2 bottom-2 bg-white text-black font-bold px-6 rounded-lg text-xs uppercase hover:bg-accent-primary transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setShowHowTo(true)} className="btn-premium py-4">
            <Info size={18} /> Match Manual
          </button>
          <button onClick={() => router.push('/demo')} className="btn-premium py-4 border-accent-secondary/30 text-accent-secondary hover:bg-accent-secondary hover:text-black">
            <Gamepad2 size={18} /> Training Grounds
          </button>
        </div>
      </main>

      {/* 🤖 RIGHT SIDEBAR: AI & ACTIVITY */}
      <aside className="layout-sidebar-right no-scrollbar">
        <section className="card-premium">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="text-accent-secondary" size={20} />
            <h3 className="text-xs font-bold uppercase tracking-widest">AI Simulation</h3>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {(['BASIC', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((level) => (
                <button 
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`py-3 rounded-lg border font-display text-sm transition-all ${
                    difficulty === level 
                      ? 'bg-accent-secondary text-black border-accent-secondary' 
                      : 'bg-surface-2 text-foreground-muted border-glass-border hover:border-accent-secondary/50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <button 
              onClick={() => handleStartGame('bot')}
              className="w-full btn-premium bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary hover:text-black py-4 group"
            >
              <Play size={18} className="group-hover:fill-black" />
              <span className="font-display text-lg uppercase">Start AI Match</span>
            </button>
          </div>
        </section>

        <section className="card-premium flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Signal size={14} className="text-accent-secondary" /> Recent Matches
            </h3>
            <button className="text-[9px] font-bold uppercase text-accent-primary hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {[
              { vs: 'BOT_ULTRA', result: 'WON', score: '42/0' },
              { vs: 'PLAYER_921', result: 'LOST', score: '12/1' },
              { vs: 'BOT_HIGH', result: 'WON', score: '38/0' },
            ].map((match, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-2 border border-glass-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-tighter">vs {match.vs}</p>
                  <p className="text-[9px] text-foreground-muted">{match.score}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded ${
                  match.result === 'WON' ? 'bg-accent-secondary/10 text-accent-secondary' : 'bg-accent-danger/10 text-accent-danger'
                }`}>
                  {match.result}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="card-premium bg-accent-primary/5 border-accent-primary/20 p-4 text-center">
          <p className="text-[10px] font-bold text-accent-primary uppercase mb-1">Weekly Tournament</p>
          <p className="text-xs text-foreground-muted mb-3">Compete for the Golden Glove</p>
          <div className="flex items-center justify-center gap-2">
            <Users size={12} />
            <span className="text-[10px] font-bold">428 Registered</span>
          </div>
        </div>
      </aside>

      {/* 🧭 FOOTER */}
      <footer className="layout-footer">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-secondary" />
          <span>System Operational</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-surface-3" />
        <span>HPL – Hand Cricket Premier League © 2026</span>
        <div className="w-1 h-1 rounded-full bg-surface-3" />
        <span className="text-accent-primary cursor-pointer hover:underline">Support</span>
      </footer>

      <HowToPlay isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-accent-danger text-white rounded-full font-bold text-sm shadow-2xl z-50 flex items-center gap-3"
        >
          <ShieldCheck size={18} /> {error}
        </motion.div>
      )}
    </div>
  );
}

