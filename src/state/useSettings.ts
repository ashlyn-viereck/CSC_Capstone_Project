import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotifIntensity = 'OFF' | 'LIGHT' | 'STANDARD' | 'FOCUSED' | 'INTENSE';
export type ToneMode = 'NEUTRAL' | 'CARING' | 'MANIPULATIVE';

type SettingsStore = {
  notifIntensity: NotifIntensity;
  toneMode: ToneMode;
  hydrate: () => Promise<void>;
  setNotifIntensity: (m: NotifIntensity) => Promise<void>;
  setToneMode: (t: ToneMode) => Promise<void>;
};

const K = 'settings_v2';

export const useSettings = create<SettingsStore>((set, get) => ({
  notifIntensity: 'STANDARD',
  toneMode: 'MANIPULATIVE',

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(K);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.notifIntensity) set({ notifIntensity: data.notifIntensity as NotifIntensity });
      if (data.toneMode) set({ toneMode: data.toneMode as ToneMode });
    } catch {}
  },

  setNotifIntensity: async (m) => {
    set({ notifIntensity: m });
    await AsyncStorage.setItem(K, JSON.stringify({
      notifIntensity: get().notifIntensity,
      toneMode: get().toneMode,
    }));
  },

  setToneMode: async (t) => {
    set({ toneMode: t });
    await AsyncStorage.setItem(K, JSON.stringify({
      notifIntensity: get().notifIntensity,
      toneMode: get().toneMode,
    }));
  },
}));
