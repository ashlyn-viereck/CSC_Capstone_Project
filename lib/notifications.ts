import * as Notifications from "expo-notifications";
import { isAfter, subMinutes } from "date-fns";
import { setNotifIds, type Task } from "@/lib/db";

// Message lines per intensity
const LINES = {
  1: ["Gentle nudge 🐼", "Your task misses you ✨", "Tiny prod — 5 min helps!"],
  2: ["Nessie surfaces 🐍", "Moderate push 🧭", "Tap back — future-you thanks"],
  3: ["THE RACCOON DEMANDS TRIBUTE 🦝", "Chupacabra is watching 👀", "Threat level: spicy. Finish now."],
} as const;

function msg(level: 1 | 2 | 3) {
  const arr = LINES[level];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Minutes-before schedule ladder per intensity. If no due date, we space from 'now'. */
function scheduleTemplate(intensity: 1 | 2 | 3, hasDue: boolean): number[] {
  if (!hasDue) {
    // No due date → nudges from now
    return intensity === 1 ? [60] : intensity === 2 ? [60, 20] : [60, 30, 10, 2];
  }
  // With due date → escalate toward deadline
  return intensity === 1 ? [120, 30] : intensity === 2 ? [240, 120, 30, 5] : [720, 240, 60, 30, 10, 2];
}

/** Convert a future Date to a relative seconds trigger (Expo Go-friendly) */
function secondsFromNow(when: Date) {
  return Math.max(1, Math.floor((when.getTime() - Date.now()) / 1000));
}

export async function scheduleForTask(t: Pick<Task, "id" | "title" | "intensity" | "dueISO">) {
  const ids: string[] = [];
  const now = new Date();
  const due = t.dueISO ? new Date(t.dueISO) : null;
  const hasDue = !!due && isAfter(due, now);
  const ladder = scheduleTemplate(t.intensity, hasDue);

  // Intensity 3 gets an immediate playful ping
  if (t.intensity === 3) {
    const n = await Notifications.scheduleNotificationAsync({
      content: { title: t.title, body: msg(3) },
      trigger: null, // fire now
    });
    ids.push(n);
  }

  // Schedule nudges relative to now or the due date
  for (const minBefore of ladder) {
    const when = due ? subMinutes(due, minBefore) : subMinutes(now, -minBefore);
    if (isAfter(when, now)) {
      const n = await Notifications.scheduleNotificationAsync({
        content: { title: t.title, body: msg(t.intensity) },
        // Use relative-seconds trigger so it works reliably in Expo Go
        trigger: { seconds: secondsFromNow(when) },
        // If you prefer absolute time, you can do: trigger: { date: when }
      });
      ids.push(n);
    }
  }

  await setNotifIds(t.id, ids);
  return ids;
}

export async function cancelNotificationsForTask(_taskId: number) {
  // Simple starter: cancel all scheduled notifications.
  // (Later you can store and selectively cancel per-task using notifIds.)
  await Notifications.cancelAllScheduledNotificationsAsync();
}
