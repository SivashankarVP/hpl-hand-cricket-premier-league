"use client";
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function AntiGravityBall({ isOut, move, isActive }) {
  // Generate random floating paths for the ball
  const floatingPath = useMemo(() => ({
    x: [0, 10, -10, 5, -5, 0],
    y: [0, -15, 10, -10, 5, 0],
    rotate: [0, 180, 360, 540, 720],
  }), []);

  const outAnimation = {
    scale: [1, 1.5, 0],
    opacity: [1, 1, 0],
    filter: ['blur(0px)', 'blur(10px)', 'blur(40px)'],
    y: [0, -100],
    transition: { duration: 1.5, ease: "easeOut" }
  };

  const scoreAnimation = {
    scale: [1, 1.2, 1],
    y: [0, -40, 0],
    filter: ['drop-shadow(0 0 0px var(--primary))', 'drop-shadow(0 0 30px var(--primary))', 'drop-shadow(0 0 0px var(--primary))'],
    transition: { duration: 0.8, ease: "easeInOut" }
  };

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* 🔮 Energy Orbitals */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed border-white/5 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-dashed border-yellow-500/10 rounded-full"
      />

      {/* 🥎 The Anti-Gravity Ball */}
      <motion.div
        animate={isOut ? outAnimation : (isActive ? scoreAnimation : floatingPath)}
        transition={isActive || isOut ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-[0_0_50px_rgba(255,215,0,0.3)] flex items-center justify-center border-4 border-white/20 relative overflow-hidden group">
            {/* Surface Texture / Shine */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <div className="absolute -inset-2 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_100%)]" />
            
            {/* The Number */}
            <span className="text-5xl font-heading italic text-black drop-shadow-lg relative z-10">
                {move || "?"}
            </span>

            {/* Glowing Core */}
            <div className="absolute inset-0 bg-yellow-500/20 blur-xl animate-pulse" />
        </div>
        
        {/* Anti-Gravity Particles */}
        <AnimatePresence>
            {!isOut && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-10 -z-10"
                >
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                y: [-10, -40],
                                x: [0, (i % 2 === 0 ? 20 : -20)],
                                opacity: [0, 0.5, 0],
                                scale: [0, 1, 0.5]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                                ease: "easeOut"
                            }}
                            className="absolute left-1/2 bottom-0 w-1.5 h-1.5 bg-yellow-500 rounded-full blur-[2px]"
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

import { AnimatePresence } from 'framer-motion';
