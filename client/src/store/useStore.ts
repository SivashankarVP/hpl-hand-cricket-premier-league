import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStats {
  wins: number;
  losses: number;
  highestScore: number;
  matchesPlayed: number;
}

interface UserProfile {
  username: string;
  avatar: string;
  stats?: UserStats;
}

interface AppState {
  user: UserProfile | null;
  theme: 'dark' | 'light';
  setUser: (user: UserProfile) => void;
  setStats: (stats: UserStats) => void;
  toggleTheme: () => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'dark',
      setUser: (user) => set({ user }),
      setStats: (stats) => set((state) => ({ 
        user: state.user ? { ...state.user, stats } : null 
      })),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : 'dark' 
      })),
      logout: () => set({ user: null }),
    }),
    {
      name: 'hpl-storage',
    }
  )
);
