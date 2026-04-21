"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

interface BallEngineProps {
  state: 'idle' | 'moving' | 'hit' | 'out';
  value?: number;
  isAntiGravity?: boolean;
}

export default function BallEngine({ state, value, isAntiGravity = true }: BallEngineProps) {
  const controls = useAnimation();

  useEffect(() => {
    const playAnimation = async () => {
      if (state === 'moving') {
        // Futuristic Curved Trajectory
        await controls.start({
          x: [0, -50, 0],
          y: [0, -200, 0],
          scale: [1, 1.5, 0.8],
          rotate: [0, 180, 360],
          transition: {
            duration: isAntiGravity ? 1.5 : 0.6,
            ease: isAntiGravity ? "easeInOut" : "linear",
            times: [0, 0.5, 1]
          }
        });
      } else if (state === 'hit') {
        // Velocity Burst
        await controls.start({
          y: -1000,
          scale: 0.2,
          opacity: 0,
          transition: { duration: 0.5, ease: "easeOut" }
        });
      } else if (state === 'out') {
        // Glitch/Wobble
        await controls.start({
          x: [-5, 5, -5, 5, 0],
          scale: [1, 1.2, 0],
          opacity: [1, 1, 0],
          transition: { duration: 0.4 }
        });
      } else {
        // Idle Floating
        controls.start({
          y: [0, -10, 0],
          rotate: [0, 5, 0],
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        });
      }
    };

    playAnimation();
  }, [state, isAntiGravity, controls]);

  return (
    <div className="relative flex flex-col items-center justify-center h-64 w-full">
      {/* 🔮 Energy Rings */}
      {isAntiGravity && state !== 'idle' && (
        <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2, opacity: [0, 0.5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute w-20 h-20 rounded-full border border-cyan-500/30"
        />
      )}

      {/* 🏏 The Floating Ball */}
      <motion.div 
        animate={controls}
        className="gravity-ball flex items-center justify-center z-10"
      >
        <AnimatePresence>
            {value && state === 'moving' && (
                <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-white font-cyber text-4xl neon-text"
                >
                    {value}
                </motion.span>
            )}
        </AnimatePresence>
      </motion.div>

      {/* Shadow Effect */}
      <motion.div 
        animate={{ scale: state === 'moving' ? 1.5 : 1, opacity: state === 'moving' ? 0.1 : 0.2 }}
        className="absolute bottom-4 w-20 h-2 bg-black/40 rounded-full blur-xl" 
      />
    </div>
  );
}
