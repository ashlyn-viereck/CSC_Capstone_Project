import { create } from "zustand";
import { differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";

interface GState {
  points: number;
  streak: number;
  lastClaimISO?: string;
  ownedSkins: string[];
  awardCompletion: (intensity: 1 | 2 | 3) => void;
  dailyCountdown: () => string;
  pullGacha: () => void;
}

export const useGamification = create<GState>((set, get) => ({
  points: 0,
  streak: 0,
  ownedSkins: [],
  awardCompletion: (intensity) => {
    const base = intensity === 1 ? 5 : intensity === 2 ? 10 : 20;
    set({ points: get().points + base });
  },
  dailyCountdown: () => {
    const last = get().lastClaimISO ? new Date(get().lastClaimISO!) : undefined;
    if (!last) return "Ready";
    const diff = differenceInCalendarDays(new Date(), last);
    return diff >= 1 ? "Ready" : formatDistanceToNowStrict(new Date(last.getTime() + 24 * 3600 * 1000));
  },
  pullGacha: () => {
    const cost = 100;
    if (get().points < cost) return;
    const pool = ["Mothman Cape", "Nessie Hat", "Raccoon Gloves", "Chupacabra Cloak"];
    const got = pool[Math.floor(Math.random() * pool.length)];
    set({
      points: get().points - cost,
      ownedSkins: Array.from(new Set([...get().ownedSkins, got])),
    });
  },
}));
