// src/data/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSettings, type NotifIntensity, type ToneMode } from '../state/useSettings';
import { useGacha } from '../state/useGacha';

// ----------------------------------------------------
// Notification handler (SDK 53+ needs banner/list flags)
// ----------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // iOS-specific (required by newer types)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ----------------------------------------------------
// Basics used during app boot
// ----------------------------------------------------
export async function ensureNotifPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync().catch(() => {});
  }
}

export async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: undefined,
  });
}

// ----------------------------------------------------
// Intensity model (how many pre-due reminders)
// ----------------------------------------------------
export function offsetsForIntensity(mode: NotifIntensity): number[] {
  switch (mode) {
    case 'OFF':      return [];
    case 'LIGHT':    return [60]; // 1h
    case 'STANDARD': return [24 * 60, 60]; // 1d, 1h
    case 'FOCUSED':  return [2 * 24 * 60, 12 * 60, 60, 15]; // 2d, 12h, 1h, 15m
    case 'INTENSE':  return [7 * 24 * 60, 3 * 24 * 60, 24 * 60, 12 * 60, 60, 30, 10, 5];
    default:         return [24 * 60, 60];
  }
}

function fmtDelta(mins: number) {
  if (mins >= 24 * 60) return `${Math.round(mins / (24 * 60))} day(s)`;
  if (mins >= 60)     return `${Math.round(mins / 60)} hour(s)`;
  return `${mins} minute(s)`;
}

// Pet-voiced copy that escalates with time/tone
function buildBody(petName: string, taskTitle: string, minsBefore: number, tone: ToneMode): string {
  if (tone === 'NEUTRAL') {
    return `${taskTitle} is due in ${fmtDelta(minsBefore)}.`;
  }
  if (tone === 'CARING') {
    if (minsBefore >= 60) return `${petName} wants to remind you: “${taskTitle}” is due in ${fmtDelta(minsBefore)} 💛`;
    if (minsBefore >= 15) return `${petName} is cheering for you! “${taskTitle}” in ${fmtDelta(minsBefore)} ✨`;
    return `${petName}: You got this—“${taskTitle}” is almost due!`;
  }
  // MANIPULATIVE
  if (minsBefore >= 24 * 60) return `${petName} is thinking about “${taskTitle}” (due in ${fmtDelta(minsBefore)}). Don’t make them worry…`;
  if (minsBefore >= 60)     return `${petName} really needs you to handle “${taskTitle}” (due in ${fmtDelta(minsBefore)}).`;
  if (minsBefore >= 15)     return `${petName} is getting nervous… “${taskTitle}” is due in ${fmtDelta(minsBefore)}.`;
  if (minsBefore >= 5)      return `${petName} is kind of disappointed you haven’t finished “${taskTitle}” yet. It’s due in ${fmtDelta(minsBefore)}.`;
  return `${petName} is VERY disappointed you still haven’t finished “${taskTitle}.”`;
}

// ----------------------------------------------------
// Helpers used by useTasks.ts
// ----------------------------------------------------
export async function cancelTaskNotifications(existingIds: string[]) {
  await Promise.all(
    existingIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

/**
 * Schedules notifications for a task according to the current intensity/tone.
 * Guarantees that only future triggers are scheduled (adds a small cushion).
 * Returns the scheduled IDs so you can JSON.stringify([]) them into task.notifId.
 */
export async function scheduleTaskNotifications(
  task: { id: number; title: string; dueAt?: number | null },
  mode: NotifIntensity,
  channelId = 'default'
): Promise<string[]> {
  const ids: string[] = [];
  if (!task.dueAt || mode === 'OFF') return ids;

  const nowMs = Date.now();
  const dueMs = task.dueAt; // EXPECTED: epoch milliseconds
  const { toneMode } = useSettings.getState();
  const petName = useGacha.getState().pet.name || 'Your pet';

  // Never schedule "at this instant" (platforms will fire immediately if <= now).
  const MIN_LEAD_MS = 15_000;

  // Pre-due reminders
  for (const mins of offsetsForIntensity(mode)) {
    const whenMs = dueMs - mins * 60_000;
    let delta = whenMs - nowMs;

    // Skip if already in the past
    if (delta <= 0) continue;

    // Round tiny deltas up to a small cushion
    if (delta < MIN_LEAD_MS) delta = MIN_LEAD_MS;

    const targetDate = new Date(nowMs + delta);

    // DEV: log schedule times
    if (__DEV__) {
      console.log(
        `[notif] schedule pre-due ${mins}m for task ${task.id} @ ${targetDate.toISOString()}`
      );
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task reminder',
        body: buildBody(petName, task.title, mins, toneMode),
        sound: Platform.OS === 'android' ? undefined : 'default',
      },
      trigger: { date: targetDate, channelId },
    });
    ids.push(id);
  }

  // Post-due stinger (schedule only if due time is still in the future)
  if ((mode === 'FOCUSED' || mode === 'INTENSE') && dueMs > nowMs) {
    let delta = dueMs + 30 * 60_000 - nowMs; // 30m after due
    if (delta < MIN_LEAD_MS) delta = MIN_LEAD_MS;
    const targetDate = new Date(nowMs + delta);

    if (__DEV__) {
      console.log(
        `[notif] schedule post-due +30m for task ${task.id} @ ${targetDate.toISOString()}`
      );
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Past due',
        body: `${petName} is very disappointed you still haven’t finished “${task.title}.”`,
        sound: Platform.OS === 'android' ? undefined : 'default',
      },
      trigger: { date: targetDate, channelId },
    });
    ids.push(id);
  }

  return ids;
}
