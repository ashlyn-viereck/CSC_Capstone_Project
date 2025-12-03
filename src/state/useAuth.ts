import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type User = { email: string; username?: string };

type UserRecord = {
  email: string;
  username?: string;
  pwdHash: string;
  createdAt: number;
};

type AuthStore = {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const USERS_KEY = 'auth_users_v1';     // map of emailLower -> UserRecord
const ACTIVE_KEY = 'auth_active_v1';   // emailLower of active user

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    const active = await AsyncStorage.getItem(ACTIVE_KEY);
    if (!active) { set({ user: null, loading: false }); return; }
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users: Record<string, UserRecord> = usersRaw ? JSON.parse(usersRaw) : {};
    const rec = users[active];
    set({ user: rec ? { email: rec.email, username: rec.username } : null, loading: false });
  },

  signUp: async (email, password, username) => {
    const emailLower = email.trim().toLowerCase();
    const pwdHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users: Record<string, UserRecord> = usersRaw ? JSON.parse(usersRaw) : {};

    if (users[emailLower]) throw new Error('An account with this email already exists.');
    users[emailLower] = { email: emailLower, username, pwdHash, createdAt: Date.now() };

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    await AsyncStorage.setItem(ACTIVE_KEY, emailLower);
    set({ user: { email: emailLower, username } });
  },

  signIn: async (email, password) => {
    const emailLower = email.trim().toLowerCase();
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users: Record<string, UserRecord> = usersRaw ? JSON.parse(usersRaw) : {};
    const rec = users[emailLower];
    if (!rec) throw new Error('Account not found');

    const pwdHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
    if (pwdHash !== rec.pwdHash) throw new Error('Wrong password');

    await AsyncStorage.setItem(ACTIVE_KEY, emailLower);
    set({ user: { email: rec.email, username: rec.username } });
  },

  signOut: async () => {
    await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ user: null });
  },
}));
