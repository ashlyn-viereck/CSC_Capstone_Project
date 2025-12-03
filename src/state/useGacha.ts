import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

// ---------- Types ----------
export type ItemCategory = 'Accessory' | 'Consumable' | 'Creature' | 'Misc';
export type Rarity = 'C' | 'R' | 'SR' | 'UR';

export type ConvertSummary = {
  totalGems: number;
  lines: { id: string; name: string; rarity: Rarity; removed: number; gems: number }[];
};

export type PullResult = {
  item: Item;
  duplicate: boolean;
  gemsAwarded: number; // from dup conversion (0 if new)
};

export type Item = {
  id: string;                 // stable ID (e.g., 'ferret', 'halo')
  name: string;               // display name
  rarity: Rarity;
  category: ItemCategory;
};

export type Pet = {
  name: string;               // user-editable
  species: string;            // 'Ferret', 'Nessie', etc.
  level: number;
  happiness: number;          // 0..100
  equippedAccessories: string[]; // array of Item IDs
  leftAt?: number | null; // when pet left; null/undefined if still with you
};

type GachaStore = {
  // state
  gems: number;
  pet: Pet;
  inventory: Item[];

  // lifecycle
  reset: () => Promise<void>;
  hydrate: () => Promise<void>;

  // economy
  addGems: (n: number) => Promise<void>;
  spendGems: (n: number) => Promise<boolean>;

  // pet care
  feedPet: (n: number) => Promise<void>;
  renamePet: (name: string) => Promise<void>;
  equipAccessory: (itemId: string) => Promise<void>;
  unequipAccessory: (itemId: string) => Promise<void>;
  setActiveCreature: (itemId: string) => Promise<void>;

  // gacha
  pullOnce: () => Promise<PullResult | null>;
  pullTen: () => Promise<PullResult[] | null>;

  clearInventory: () => Promise<void>;
  convertDuplicatesInInventory: () => Promise<ConvertSummary>;
  applyOverdueMoodPenalty: (overduePoints: number) => Promise<void>;
  reconcilePet: (costGems?: number) => Promise<boolean>; // spend gems to bring back
};

// ---------- Per-user storage ----------
const BASE_KEY = 'gacha_v1';
const storageKey = () => {
  const email = useAuth.getState().user?.email?.toLowerCase() ?? 'guest';
  return `${BASE_KEY}:${email}`;
};

// ---------- Pool (Creatures + Accessories) ----------
const DUP_GEMS: Record<Rarity, number> = { C: 1, R: 5, SR: 10, UR: 50 };

async function persist() {
  await AsyncStorage.setItem(storageKey(), JSON.stringify({
    gems: useGacha.getState().gems,
    pet: useGacha.getState().pet,
    inventory: useGacha.getState().inventory,
  }));
}

const pool: Item[] = [
  // Creatures (your list)
  { id: 'panda', name: 'Panda', rarity: 'R', category: 'Creature' },
  { id: 'ferret', name: 'Ferret', rarity: 'C', category: 'Creature' },
  { id: 'raccoon', name: 'Raccoon', rarity: 'C', category: 'Creature' },
  { id: 'nessie', name: 'Nessie', rarity: 'SR', category: 'Creature' }, // Loch Ness Monster
  { id: 'mothman', name: 'Mothman', rarity: 'SR', category: 'Creature' },
  { id: 'chupacabra', name: 'Chupacabra', rarity: 'UR', category: 'Creature' },

  // Accessories
  { id: 'bow_red', name: 'Red Bow', rarity: 'C', category: 'Accessory' },
  { id: 'cap_blue', name: 'Blue Cap', rarity: 'R', category: 'Accessory' },
  { id: 'halo', name: 'Halo', rarity: 'SR', category: 'Accessory' },
  { id: 'crown', name: 'Golden Crown', rarity: 'UR', category: 'Accessory' },
];

// Rarity weights: C 60%, R 28%, SR 10%, UR 2%
function roll(): Item {
  const r = Math.random() * 100;
  const rarity: Rarity = r < 60 ? 'C' : r < 88 ? 'R' : r < 98 ? 'SR' : 'UR';
  const candidates = pool.filter(p => p.rarity === rarity);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ---------- Defaults ----------
const defaultState = {
  gems: 0,
  pet: { name: 'Pico', species: 'Ferret', level: 1, happiness: 50, equippedAccessories: [] as string[] },
  inventory: [] as Item[],
};

// ---------- Store ----------
export const useGacha = create<GachaStore>((set, get) => ({
  ...defaultState,

  // wipe in-memory state (used when switching users)
  reset: async () => {
    set({ ...defaultState });
  },

  clearInventory: async () => {
    set(s => ({ ...s, inventory: [] }));
    await persist();
  },

  convertDuplicatesInInventory: async () => {
    const byId = new Map<string, Item[]>();
    for (const it of get().inventory) {
      const list = byId.get(it.id) ?? [];
      list.push(it);
      byId.set(it.id, list);
    }

    const uniques: Item[] = [];
    let totalGems = 0;
    const lines: ConvertSummary['lines'] = [];

    for (const [id, items] of byId.entries()) {
      const keep = items[0];                     // keep one
      const extras = items.slice(1);             // convert the rest
      uniques.push(keep);

      if (extras.length > 0) {
        const per = DUP_GEMS[keep.rarity];
        const gems = per * extras.length;
        totalGems += gems;
        lines.push({ id, name: keep.name, rarity: keep.rarity, removed: extras.length, gems });
      }
    }

    set(s => ({ gems: s.gems + totalGems, inventory: uniques }));
    await persist();
    return { totalGems, lines };
  },

  // load current user's save; seed a starter ferret if no creature
  hydrate: async () => {
    const key = storageKey();
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Pick<GachaStore, 'gems' | 'pet' | 'inventory'>;
        set({
          gems: typeof saved.gems === 'number' ? saved.gems : 0,
          pet: {
            name: saved.pet?.name ?? 'Pico',
            species: saved.pet?.species ?? 'Ferret',
            level: saved.pet?.level ?? 1,
            happiness: saved.pet?.happiness ?? 50,
            equippedAccessories: saved.pet?.equippedAccessories ?? [],
          },
          inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
        });
      } catch {
        set({ ...defaultState });
      }
    }

    // seed a starter creature the first time a user plays
    const hasCreature = get().inventory.some(i => i.category === 'Creature');
    if (!hasCreature) {
      set(s => ({ inventory: [{ id: 'ferret', name: 'Ferret', rarity: 'C', category: 'Creature' }, ...s.inventory] }));
    }

    await AsyncStorage.setItem(key, JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  addGems: async (n) => {
    set(s => ({ gems: s.gems + n }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  spendGems: async (n) => {
    if (get().gems < n) return false;
    set(s => ({ gems: s.gems - n }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
    return true;
  },

  feedPet: async (n) => {
    set(s => {
      const happiness = Math.min(100, s.pet.happiness + n);
      const levelUp = happiness === 100 ? 1 : 0;
      return { pet: { ...s.pet, happiness: levelUp ? 20 : happiness, level: s.pet.level + levelUp } };
    });
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  renamePet: async (name) => {
    set(s => ({ pet: { ...s.pet, name: name.trim() || s.pet.name } }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  equipAccessory: async (itemId) => {
    const item = get().inventory.find(i => i.id === itemId && i.category === 'Accessory');
    if (!item) return;
    set(s => ({
      pet: { ...s.pet, equippedAccessories: Array.from(new Set([...s.pet.equippedAccessories, itemId])) }
    }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  unequipAccessory: async (itemId) => {
    set(s => ({
      pet: { ...s.pet, equippedAccessories: s.pet.equippedAccessories.filter(id => id !== itemId) }
    }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  setActiveCreature: async (itemId) => {
    const creature = get().inventory.find(i => i.id === itemId && i.category === 'Creature');
    if (!creature) return;
    set(s => ({ pet: { ...s.pet, species: creature.name } }));
    await AsyncStorage.setItem(storageKey(), JSON.stringify({
      gems: get().gems, pet: get().pet, inventory: get().inventory
    }));
  },

  pullOnce: async () => {
    const ok = await get().spendGems(10); // cost checked & persisted inside spendGems
    if (!ok) return null;

    const it = roll();
    const already = get().inventory.some(x => x.id === it.id);

    let result: PullResult;
    if (already) {
      const bonus = DUP_GEMS[it.rarity];
      set(s => ({ gems: s.gems + bonus }));
      result = { item: it, duplicate: true, gemsAwarded: bonus };
    } else {
      set(s => ({ inventory: [it, ...s.inventory] }));
      result = { item: it, duplicate: false, gemsAwarded: 0 };
    }

    await persist();
    return result;
  },
  pullTen: async () => {
    const ok = await get().spendGems(100);
    if (!ok) return null;

    const results: PullResult[] = [];
    // We'll batch changes then persist once at the end
    let addedInventory: Item[] = [];
    let gemBonus = 0;

    const currentIds = new Set(get().inventory.map(i => i.id));

    for (let i = 0; i < 10; i++) {
      const it = roll();
      const id = it.id;
      const isDup = currentIds.has(id) || addedInventory.some(ai => ai.id === id);

      if (isDup) {
        const bonus = DUP_GEMS[it.rarity];
        gemBonus += bonus;
        results.push({ item: it, duplicate: true, gemsAwarded: bonus });
      } else {
        addedInventory.push(it);
        results.push({ item: it, duplicate: false, gemsAwarded: 0 });
      }
    }

    set(s => ({
      gems: s.gems + gemBonus,
      inventory: [...addedInventory, ...s.inventory],
    }));

    await persist();
    return results;
  },
    applyOverdueMoodPenalty: async (points) => {
    if (points <= 0) return;
    const s = get();
    if (s.pet.leftAt) return; // already gone
    const newHp = Math.max(0, s.pet.happiness - points);
    const leftAt = newHp === 0 ? Date.now() : null;
    set({ pet: { ...s.pet, happiness: newHp, leftAt } });
    await AsyncStorage.setItem(storageKey(), JSON.stringify({ gems: get().gems, pet: get().pet, inventory: get().inventory }));
  },

  reconcilePet: async (costGems = 50) => {
    const s = get();
    if (s.gems < costGems) return false;
    set({
      gems: s.gems - costGems,
      pet: { ...s.pet, happiness: 50, leftAt: null },
    });
    await AsyncStorage.setItem(storageKey(), JSON.stringify({ gems: get().gems, pet: get().pet, inventory: get().inventory }));
    return true;
  },
}));
