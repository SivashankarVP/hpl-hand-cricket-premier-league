"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Arena from '@/components/Game/Arena';
import { useSocket } from '@/context/SocketContext';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const socket = useSocket();
  const user = useStore((state) => state.user);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!socket || !id || !user) return;

    // Join room automatically if we have a user
    socket.emit('joinRoom', { roomId: id.toString().toUpperCase(), username: user.username });

    socket.on('playerJoined', (room) => {
        setRoomData(room);
    });

    socket.on('gameStarted', (room) => {
        setRoomData(room);
    });

    socket.on('error', (msg) => {
        setError(msg);
    });

    return () => {
        socket.off('playerJoined');
        socket.off('gameStarted');
        socket.off('error');
    };
  }, [socket, id, user]);

  if (!user && !roomData) {
      // Redirect to home with room ID stored for later
      return (
        <div className="min-h-screen hpl-gradient flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 max-w-sm">
                <h1 className="text-4xl font-black italic gold-text tracking-tighter">HPL</h1>
                <p className="text-gray-400">You need to set a username before joining the match.</p>
                <button 
                    onClick={() => router.push(`/?room=${id}`)}
                    className="w-full bg-yellow-500 text-blue-950 font-black py-4 rounded-3xl"
                >
                    SET USERNAME
                </button>
            </motion.div>
        </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-screen hpl-gradient flex items-center justify-center p-6 text-center">
              <div className="space-y-4">
                  <p className="text-red-400 font-bold">{error}</p>
                  <button onClick={() => router.push('/')} className="px-6 py-2 bg-white/10 rounded-xl">BACK HOME</button>
              </div>
          </div>
      );
  }

  return (
    <Arena 
        room={roomData} 
        username={user?.username || "Player"} 
        isDemo={false} 
        onExit={() => router.push('/')} 
    />
  );
}
