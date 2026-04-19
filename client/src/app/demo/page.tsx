"use client";
import React from 'react';
import Arena from '@/components/Game/Arena';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function DemoPage() {
  const router = useRouter();
  const user = useStore((state) => state.user);

  return (
    <Arena 
        room={null} 
        username={user?.username || "Player"} 
        isDemo={true} 
        onExit={() => router.push('/')} 
    />
  );
}
