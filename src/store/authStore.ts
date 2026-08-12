// @ts-nocheck
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => {
      subscription?.unsubscribe();
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

export default useAuthStore;
