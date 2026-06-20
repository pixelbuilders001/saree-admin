import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    username: string;
    role: string;
}

interface AuthState {
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            login: () => set({ isAuthenticated: true }),
            logout: () => set({ isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
