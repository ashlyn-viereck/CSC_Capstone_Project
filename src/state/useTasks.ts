import { create } from 'zustand';
import {
  Task,
  allTasks,
  insertTask,
  updateTask,
  deleteTask,
  getTask,
  parseNotifIds,
} from '../data/db';
import { useSettings } from './useSettings';
import {
  scheduleTaskNotifications,
  cancelTaskNotifications,
} from '../data/notifications';
import { useGacha } from './useGacha';

type TaskInput = { title: string; notes?: string; dueAt?: number | null };

type Store = {
  ready: boolean;
  tasks: Task[];
  refresh: () => Promise<void>;
  add: (t: TaskInput) => Promise<number>;
  toggleComplete: (id: number) => Promise<void>;
  edit: (id: number, patch: Partial<Task>) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

export const useTasks = create<Store>((set, get) => ({
  ready: false,
  tasks: [],

  refresh: async () => {
    const rows = await allTasks();
    set({ tasks: rows, ready: true });
  },

  // Create task → schedule notifications per current intensity
  add: async ({ title, notes, dueAt }) => {
    const id = await insertTask({
      title,
      notes,
      dueAt: dueAt ?? null,
      completed: 0,
      notifId: null, // we'll fill after scheduling
    });

    const t = await getTask(id);
    if (t && t.dueAt) {
      const mode = useSettings.getState().notifIntensity;
      const ids = await scheduleTaskNotifications(t, mode, 'default');
      await updateTask(id, { notifId: JSON.stringify(ids) });
    }

    await get().refresh();
    return id;
  },

  // Toggle complete: cancel notifs when completing; reschedule when un-completing
  toggleComplete: async (id) => {
    const t = await getTask(id);
    if (!t) return;

    const completed = t.completed ? 0 : 1;

    if (completed === 1) {
      // mark complete → cancel any future reminders, give reward
      await cancelTaskNotifications(parseNotifIds(t.notifId));
      await updateTask(id, { completed, notifId: JSON.stringify([]) });
      await useGacha.getState().addGems(5);
    } else {
      // mark incomplete again → reschedule if dueAt exists
      await updateTask(id, { completed });
      const upd = await getTask(id);
      if (upd && upd.dueAt) {
        const mode = useSettings.getState().notifIntensity;
        const ids = await scheduleTaskNotifications(upd, mode, 'default');
        await updateTask(id, { notifId: JSON.stringify(ids) });
      }
    }

    await get().refresh();
  },

  // Edit: if title or dueAt changes, cancel old and reschedule with current intensity
  edit: async (id, patch) => {
    const cur = await getTask(id);
    if (!cur) return;

    const touchesSchedule = 'dueAt' in patch || 'title' in patch;

    if (touchesSchedule) {
      await cancelTaskNotifications(parseNotifIds(cur.notifId));
    }

    await updateTask(id, patch);

    if (touchesSchedule) {
      const updated = await getTask(id);
      if (updated && updated.dueAt && !updated.completed) {
        const mode = useSettings.getState().notifIntensity;
        const ids = await scheduleTaskNotifications(updated, mode, 'default');
        await updateTask(id, { notifId: JSON.stringify(ids) });
      } else {
        await updateTask(id, { notifId: JSON.stringify([]) });
      }
    }

    await get().refresh();
  },

  // Remove: cancel scheduled notifications then delete
  remove: async (id) => {
    const t = await getTask(id);
    if (t) {
      await cancelTaskNotifications(parseNotifIds(t.notifId));
    }
    await deleteTask(id);
    await get().refresh();
  },
}));
