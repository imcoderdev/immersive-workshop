import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isInitialized: false,

      setSession: (session) => set({ session, user: session?.user ?? null }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      fetchProfile: async () => {
        const { user } = get();
        if (!user) {
          set({ profile: null });
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          set({ profile: null });
          return;
        }

        set({ profile: data as Profile });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null });
      },

      initialize: async () => {
        try {
          set({ isLoading: true });

          const { data: { session } } = await supabase.auth.getSession();
          set({ session, user: session?.user ?? null });

          if (session?.user) {
            await get().fetchProfile();
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            set({ session, user: session?.user ?? null });

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              await get().fetchProfile();
            }

            if (event === 'SIGNED_OUT') {
              set({ profile: null });
            }
          });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },
    }),
    {
      name: 'dsw-auth',
      partialize: (state) => ({
        // Only persist minimal state
        session: state.session,
      }),
    }
  )
);
