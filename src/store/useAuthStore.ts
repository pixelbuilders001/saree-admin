import { create } from 'zustand';

interface User {
    email: string;
    id: string;
    role?: 'admin' | 'staff' | null;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    setSession: (user: Omit<User, 'role'> | null) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    setSession: async (sessionUser) => {
        if (!sessionUser) {
            set({ user: null, isAuthenticated: false, isInitialized: true });
            return;
        }

        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', sessionUser.id)
                .single();

            if (error) {
                console.error('Error fetching profile from Supabase:', error);
            }

            const role = (!error && data && data.role) ? data.role : 'staff';
            set({
                user: { ...sessionUser, role },
                isAuthenticated: true,
                isInitialized: true,
            });
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
            set({
                user: { ...sessionUser, role: 'staff' },
                isAuthenticated: true,
                isInitialized: true,
            });
        }
    },
    logout: async () => {
        const { supabase } = await import('@/lib/supabase');
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, isInitialized: true });
    }
}));
