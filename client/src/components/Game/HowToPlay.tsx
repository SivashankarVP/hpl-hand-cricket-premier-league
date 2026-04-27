"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Info, Play, User, Users, Zap, ShieldCheck, Target, Flame } from 'lucide-react';

export default function HowToPlay({ isOpen, onClose }) {
  if (!isOpen) return null;

  const rules = [
    {
      title: "The Call",
      desc: "Both players simultaneously select a number between 1 and 6.",
      icon: <Target className="text-accent-primary" size={20} />
    },
    {
      title: "Score or Wicket?",
      desc: "If numbers match, the batsman is OUT. Otherwise, the batsman's number is added to their total score.",
      icon: <Flame className="text-accent-danger" size={20} />
    },
    {
      title: "The Inning",
      desc: "After the first batsman is out, roles swap. The second batsman must surpass the first one's score to win the match.",
      icon: <Zap className="text-accent-secondary" size={20} />
    }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 30 }}
          className="card-premium w-full max-w-2xl p-0 overflow-hidden border-2 border-accent-primary/20 shadow-4xl relative"
        >
          <div className="p-8 border-b border-glass-border flex items-center justify-between bg-surface-2">
            <div>
              <h2 className="text-4xl font-display text-gradient uppercase leading-none">Match Manual</h2>
              <p className="text-[10px] text-foreground-muted font-bold tracking-widest uppercase">HPL Official Regulations</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center hover:bg-accent-danger/20 text-accent-danger transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-surface-2 rounded-2xl border-l-4 border-accent-primary space-y-3">
                <div className="flex items-center gap-2 text-accent-primary">
                  <Flame size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Batting</span>
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed">Score runs by choosing a different number than the bowler. Reach the target to win.</p>
              </div>
              <div className="p-6 bg-surface-2 rounded-2xl border-l-4 border-accent-secondary space-y-3">
                <div className="flex items-center gap-2 text-accent-secondary">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Bowling</span>
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed">Stop the batsman by predicting their move. Match the numbers to claim a wicket.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-glass-border" />
                <h3 className="text-[10px] font-bold text-foreground-muted tracking-[0.4em] uppercase">Playbook</h3>
                <div className="h-px flex-1 bg-glass-border" />
              </div>
              
              <div className="space-y-8">
                {rules.map((rule, idx) => (
                  <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex gap-6 items-start">
                    <div className="w-12 h-12 rounded-xl bg-surface-3 border border-glass-border flex items-center justify-center flex-shrink-0 text-accent-primary font-display text-2xl shadow-lg">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 font-display text-2xl text-white uppercase tracking-wide">
                        {rule.icon}
                        {rule.title}
                      </div>
                      <p className="text-sm text-foreground-muted leading-relaxed">
                        {rule.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-accent-primary/5 p-6 rounded-2xl border border-accent-primary/10 flex items-start gap-4">
              <Info size={24} className="text-accent-primary flex-shrink-0" />
              <p className="text-xs text-accent-primary/80 font-bold italic leading-relaxed">
                PRO TIP: Frequency analysis is key. Observe your opponent's patterns—most players have "favorite" numbers they cycle through under pressure!
              </p>
            </div>
          </div>

          <div className="p-8 bg-surface-2 border-t border-glass-border text-center">
            <button 
              onClick={onClose}
              className="btn-action w-full"
            >
              Enter The Arena
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

