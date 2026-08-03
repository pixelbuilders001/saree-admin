import { create } from 'zustand';

interface User {
    email: string;
    id: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    setSession: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    setSession: (user) => set({ user, isAuthenticated: !!user, isInitialized: true }),
    logout: async () => {
        const { supabase } = await import('@/lib/supabase');
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, isInitialized: true });
    }
}));
