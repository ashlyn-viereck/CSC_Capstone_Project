import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

type User = {
  email: string;
  id: string;
};

type AuthStore = {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      set({ user: { email: data.user.email!, id: data.user.id } });
    }
    set({ loading: false });
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    // makes sure profile exists
    await supabase
      .from('profiles')
      .upsert({ id: data.user!.id, email: data.user!.email, username })
      .select();

    // auto-login after signup
    await get().signIn(email, password);
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // make sure profile exists (in case new user somehow signed in)
    await supabase
      .from('profiles')
      .upsert({ id: data.user!.id, email: data.user!.email })
      .select();

    set({ user: { email: data.user!.email!, id: data.user!.id } });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));



