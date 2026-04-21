"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Info, Play, User, Users, Zap, ShieldCheck } from 'lucide-react';

export default function HowToPlay({ isOpen, onClose }) {
  if (!isOpen) return null;

  const rules = [
    {
      title: "The Choice",
      desc: "Both players simultaneously select a number between 1 and 6.",
      icon: <CheckCircle2 className="text-emerald-400" size={18} />
    },
    {
      title: "Out or Score?",
      desc: "If numbers match, the batsman is OUT. Otherwise, the batsman's number is added to their total score.",
      icon: <AlertTriangle className="text-yellow-400" size={18} />
    },
    {
      title: "Match Victory",
      desc: "After the first batsman is out, roles swap. The second batsman must surpass the first one's score to win.",
      icon: <Zap className="text-blue-400" size={18} />
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
          className="glass-card w-full max-w-lg rounded-[3rem] overflow-hidden border-b-8 border-black shadow-4xl relative"
        >
          <div className="scanline opacity-10" />
          
          <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
            <div className="flex flex-col">
                <h2 className="text-3xl font-heading italic gold-text leading-none mb-1">PRO GUIDE</h2>
                <p className="text-[8px] font-sync text-gray-500 uppercase">HPL Official Handbook</p>
            </div>
            <button onClick={onClose} className="p-3 glass-card rounded-2xl hover:bg-white/10 transition-all text-gray-400">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto no-scrollbar relative z-10">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 glass-inset rounded-3xl space-y-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><Zap size={40} /></div>
                   <div className="flex gap-2 text-yellow-500 items-center font-sync text-[9px]">
                      <Zap size={14} /> BATTING
                   </div>
                   <p className="text-xs text-gray-400 font-medium leading-relaxed italic">Score maximum runs and reach the target. Avoid matching numbers with the bowler!</p>
                </div>
                <div className="p-6 glass-inset rounded-3xl space-y-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck size={40} /></div>
                   <div className="flex gap-2 text-cyan-500 items-center font-sync text-[9px]">
                      <ShieldCheck size={14} /> BOWLING
                   </div>
                   <p className="text-xs text-gray-400 font-medium leading-relaxed italic">Stop the scoring by predicting the batsman's number. Match the digits to get a WICKET.</p>
                </div>
             </div>

             <div className="space-y-8">
                <div className="flex items-center gap-3">
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-white/5" />
                    <h3 className="font-sync text-[9px] text-gray-500">PLAYBOOK STEPS</h3>
                    <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-white/5" />
                </div>
                
                <div className="space-y-8">
                    {rules.map((rule, idx) => (
                    <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex gap-6 items-start">
                        <div className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center flex-shrink-0 text-yellow-500 font-heading text-xl border-2 border-yellow-500/20 shadow-lg">
                        {idx + 1}
                        </div>
                        <div className="space-y-2">
                        <div className="flex items-center gap-3 font-heading italic text-gray-200 tracking-wide uppercase text-lg">
                            {rule.icon}
                            {rule.title}
                        </div>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                            {rule.desc}
                        </p>
                        </div>
                    </motion.div>
                    ))}
                </div>
             </div>

             <div className="bg-yellow-500/5 p-6 rounded-3xl border border-yellow-500/10 flex items-start gap-4">
                <Info size={24} className="text-yellow-500 flex-shrink-0" />
                <p className="text-[11px] text-yellow-500/80 font-bold italic leading-relaxed tracking-tight">
                    PRO STRATEGY: Observe frequency patterns in your opponent's play. Most players have unintentional habits that the AI and Pro players can exploit!
                </p>
             </div>
          </div>

          <div className="p-6 glass-inset bg-white/5 border-t border-white/5 text-center relative z-10">
             <button 
               onClick={onClose}
               className="w-full btn-action btn-primary py-5 rounded-[2rem] text-xl"
             >
               ENTER THE FIELD
             </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
