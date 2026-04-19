# 🏏 HPL – Hand Cricket Premier League

A high-performance, real-time multiplayer Hand Cricket platform. Built for competitive play, HPL combines the nostalgia of hand cricket with modern web technologies to deliver a premium, sports-product experience.

![HPL Arena Banner](C:\Users\SDSIVA\.gemini\antigravity\brain\fb6adeaf-9e42-4ee2-bc45-3e6187e9f371\hpl_arena_banner_1776622529515.png)

## 🎯 Key Features

- **Live Multiplayer**: Powered by Socket.io for sub-100ms move synchronization.
- **Persistent Stats**: Integration with MongoDB to track Wins, Losses, and highest scores.
- **Dynamic Routing**: Join matches via shareable links (`/room/ROOM_ID`).
- **Toss & Strategy**: Balanced 2-innings system with interactive toss and role selection.
- **Premium UI**: 
  - Framer Motion for cinematic animations.
  - Tailwind CSS with custom thematic design.
  - Dark mode by default with light mode support.
- **Smart Demo**: Practice against "Bot Bravo" in an offline-capable demo mode.

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
