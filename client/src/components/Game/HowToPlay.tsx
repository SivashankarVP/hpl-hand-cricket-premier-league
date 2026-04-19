"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Info, Play, User, Users } from 'lucide-react';

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
      title: "Winning the Game",
      desc: "After the first batsman is out, roles swap. The second batsman must surpass the first one's score to win.",
      icon: <Info className="text-blue-400" size={18} />
    }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-2xl font-black italic gold-text tracking-tighter">HPL RULES</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-400">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-3">
                   <div className="flex gap-2 text-blue-400 items-center font-bold text-xs uppercase tracking-widest">
                      <User size={14} />
                      Batting
                   </div>
                   <p className="text-sm text-gray-400">Score as many runs as possible by choosing numbers. If the bowler picks the same number, you are out!</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-3">
                   <div className="flex gap-2 text-red-400 items-center font-bold text-xs uppercase tracking-widest">
                      <Users size={14} />
                      Bowling
                   </div>
                   <p className="text-sm text-gray-400">Stop the batsman by guessing their number. If you choose the same number as the batsman, they get out.</p>
                </div>
             </div>

             <div className="space-y-6">
                <h3 className="font-black italic text-gray-300 tracking-tight flex items-center gap-2">
                   STEP BY STEP GUIDE
                </h3>
                
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500 font-bold border border-blue-500/20">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-black italic text-gray-200 tracking-tight uppercase text-sm">
                        {rule.icon}
                        {rule.title}
                      </div>
                      <p className="text-sm text-gray-400 font-medium leading-relaxed">
                        {rule.desc}
                      </p>
                    </div>
                  </div>
                ))}
             </div>

             <div className="bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/10">
                <p className="text-xs text-yellow-500 font-bold italic tracking-wide">PRO TIP: Watch your opponent's timing and patterns to predict their moves!</p>
             </div>
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5 text-center">
             <button 
               onClick={onClose}
               className="px-8 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-black transition-all"
             >
               GOT IT!
             </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
