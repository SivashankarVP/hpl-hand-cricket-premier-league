# 🏏 HPL – Hand Cricket Premier League

A high-performance, real-time multiplayer Hand Cricket platform. Built for competitive play, HPL combines the nostalgia of hand cricket with modern web technologies to deliver a premium, sports-product experience.

![HPL Arena Banner](C:\Users\SDSIVA\.gemini\antigravity\brain\fb6adeaf-9e42-4ee2-bc45-3e6187e9f371\hpl_arena_banner_1776622529515.png)

## 🎯 Key Features

- **Pro Desktop Dashboard**: A state-of-the-art 3-column layout optimized for wide viewports, featuring side-panel persistent communications and data streams.
- **Broadcast-Quality HUD**: Integrated scoreboard, data logs, and real-time connectivity stats for a professional sports experience.
- **Hybrid Controls**: Support for both precision mouse clicks and keyboard shortcuts (Keys 1-6) for elite-level gameplay.
- **Anti-Gravity Physics**: Cinematic ball animations and curved trajectories powered by Framer Motion.
- **Live Multiplayer**: High-performance synchronization via Socket.io with dedicated room management.
- **Smart Demo**: Integrated AI simulator for offline strategy testing and practice.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js (App Router)
- **State Management**: Zustand (with Persistence)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Sockets**: Socket.io-client

### Backend
- **Server**: Node.js + Express
- **Real-time**: Socket.io
- **Database**: MongoDB + Mongoose
- **Env**: Dotenv

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### 1. Server Setup
```bash
cd server
npm install
# Create a .env file (see .env.example)
npm run dev
```

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```

## 🌐 Deployment

### Backend (Render / Railway)
1. Set the root directory to `server/`.
2. Add environment variables: `MONGODB_URI`, `CORS_ORIGIN`, `PORT`.

### Frontend (Vercel)
1. Set the root directory to `client/`.
2. Add `NEXT_PUBLIC_SOCKET_URL` pointing to your backend.

---

Built by Antigravity AI for HPL Premier League. 🏆
