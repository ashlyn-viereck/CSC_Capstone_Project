import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from './useSettings';
import { useGacha } from './useGacha';
import {
  scheduleTaskNotifications,
  cancelTaskNotifications,
} from '../data/notifications';

export type Task = {
  id: number;
  profile_id: string;
  title: string;
  notes?: string | null;
  due_at?: number | null;
  completed: boolean;
  notif_ids?: string[] ;
};

type TaskInput = { title: string; notes?: string; due_at?: number | null };

type Store = {
  ready: boolean;
  tasks: Task[];
  refresh: (profileId: string) => Promise<void>;
  add: (profileId: string, t: TaskInput) => Promise<number>;
  toggleComplete: (profileId: string, id: number) => Promise<void>;
  edit: (profileId: string, id: number, patch: Partial<Task>) => Promise<void>;
  remove: (profileId: string, id: number) => Promise<void>;
};

export const useTasks = create<Store>((set, get) => ({
  ready: false,
  tasks: [],

  refresh: async (profileId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('profile_id', profileId)
      .order('completed', { ascending: true })
      .order('due_at', { ascending: true, nullsFirst: false });

    if (error) console.error('Error fetching tasks:', error);
    else set({ tasks: data ?? [], ready: true });
  },

  add: async (profileId, { title, notes, due_at }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ profile_id: profileId, title, notes, due_at, completed: false }])
      .select()
      .single();

    if (error) throw error;

    const t = data;

    // schedule notifications
    if (t.due_at) {
      const mode = useSettings.getState().notifIntensity;
      const ids = await scheduleTaskNotifications(t, mode, 'default');
      await supabase.from('tasks').update({ notif_ids: ids }).eq('id', t.id);
      t.notif_ids = ids;
    }

    set({ tasks: [t, ...get().tasks] });
    return t.id;
  },

  toggleComplete: async (profileId, id) => {
    const t = get().tasks.find((t) => t.id === id);
    if (!t) return;

    const completed = !t.completed;

    if (completed) {
      // mark complete → cancel notifications, reward
      await cancelTaskNotifications(t.notif_ids ?? []);
      await supabase.from('tasks').update({ completed, notif_ids: [] }).eq('id', id);
      await useGacha.getState().addGems(5);
    } else {
      // mark incomplete → reschedule notifications
      await supabase.from('tasks').update({ completed }).eq('id', id);
      const updated = { ...t, completed };
      if (updated.due_at) {
        const mode = useSettings.getState().notifIntensity;
        const ids = await scheduleTaskNotifications(updated, mode, 'default');
        await supabase.from('tasks').update({ notif_ids: ids }).eq('id', id);
        updated.notif_ids = ids;
      }
    }

    await get().refresh(profileId);
  },

  edit: async (profileId, id, patch) => {
    const t = get().tasks.find((t) => t.id === id);
    if (!t) return;

    const touchesSchedule = 'due_at' in patch || 'title' in patch;

    if (touchesSchedule) {
      await cancelTaskNotifications(t.notif_ids ?? []);
    }

    await supabase.from('tasks').update(patch).eq('id', id);

    if (touchesSchedule) {
      const updated = { ...t, ...patch };
      if (updated.due_at && !updated.completed) {
        const mode = useSettings.getState().notifIntensity;
        const ids = await scheduleTaskNotifications(updated, mode, 'default');
        await supabase.from('tasks').update({ notif_ids: ids }).eq('id', id);
      } else {
        await supabase.from('tasks').update({ notif_ids: [] }).eq('id', id);
      }
    }

    await get().refresh(profileId);
  },

  remove: async (profileId, id) => {
    const t = get().tasks.find((t) => t.id === id);
    if (t) {
      await cancelTaskNotifications(t.notif_ids ?? []);
    }

    await supabase.from('tasks').delete().eq('id', id);
    await get().refresh(profileId);
  },
}));
