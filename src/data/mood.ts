import { useSettings } from '../state/useSettings';
import { useGacha } from '../state/useGacha';
import { allTasks } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'mood_last_check';

function keyForUser(email: string | undefined | null) {
  return `${BASE}:${(email ?? 'guest').toLowerCase()}`;
}

// Convert overdue minutes to mood penalty “points” based on intensity
function pointsPerOverdueMinute(intensity: ReturnType<typeof useSettings.getState>['notifIntensity']) {
  switch (intensity) {
    case 'LIGHT':    return 1 / (24 * 60);   // 1 point / day overdue
    case 'STANDARD': return 1 / (12 * 60);   // 1 / 12h
    case 'FOCUSED':  return 1 / (6 * 60);    // 1 / 6h
    case 'INTENSE':  return 1 / 60;          // 1 / hour
    default:         return 0;
  }
}

// Call on app open or user switch
export async function checkOverdueAndApplyPetMood(userEmail?: string | null) {
  const k = keyForUser(userEmail);
  const lastRaw = await AsyncStorage.getItem(k);
  const last = lastRaw ? Number(lastRaw) : Date.now();
  const now = Date.now();
  await AsyncStorage.setItem(k, String(now));

  const intensity = useSettings.getState().notifIntensity;
  const ppm = pointsPerOverdueMinute(intensity);
  if (ppm === 0) return;

  const tasks = await allTasks();
  let points = 0;

  for (const t of tasks) {
    if (!t.dueAt || t.completed) continue;
    const due = t.dueAt;
    if (due >= now) continue; // not overdue
    // apply penalty only for the time slice since last check
    const start = Math.max(last, due);
    const overdueSliceMins = Math.max(0, Math.floor((now - start) / 60000));
    points += overdueSliceMins * ppm;
  }

  // round down so you need enough aggregate overdue time to matter
  const wholePoints = Math.floor(points);
  if (wholePoints > 0) {
    await useGacha.getState().applyOverdueMoodPenalty(wholePoints);
  }
}
