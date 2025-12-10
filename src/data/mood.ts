import { useSettings } from '../state/useSettings';
import { useGacha } from '../state/useGacha';
import { supabase } from '../lib/supabaseClient';

const BASE = 'mood_last_check';

function keyForUser(profileId: string | undefined | null) {
  return `${BASE}:${profileId ?? 'guest'}`;
}

// Converts overdue minutes to mood penalty “points” based on intensity
function pointsPerOverdueMinute(intensity: ReturnType<typeof useSettings.getState>['notifIntensity']) {
  switch (intensity) {
    case 'LIGHT':    return 1 / (24 * 60);   // 1 point / day overdue
    case 'STANDARD': return 1 / (12 * 60);   // 1 / 12h
    case 'FOCUSED':  return 1 / (6 * 60);    // 1 / 6h
    case 'INTENSE':  return 1 / 60;          // 1 / hour
    default:         return 0;
  }
}

// call on app open or user switch
export async function checkOverdueAndApplyPetMood(profileId?: string | null) {
  if (!profileId) return;

  // track last check per user in AsyncStorage (optional, keeps same logic)
  const k = keyForUser(profileId);
  const lastRaw = await AsyncStorage.getItem(k);
  const last = lastRaw ? Number(lastRaw) : Date.now();
  const now = Date.now();
  await AsyncStorage.setItem(k, String(now));

  const intensity = useSettings.getState().notifIntensity;
  const ppm = pointsPerOverdueMinute(intensity);
  if (ppm === 0) return;

  // get incomplete tasks from Supabase
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('profile_id', profileId)
    .eq('completed', false);

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  let points = 0;
  for (const t of tasks ?? []) {
    if (!t.due_at) continue;
    const due = t.due_at;
    if (due >= now) continue; // not overdue
    const start = Math.max(last, due);
    const overdueSliceMins = Math.max(0, Math.floor((now - start) / 60000));
    points += overdueSliceMins * ppm;
  }

  const wholePoints = Math.floor(points);
  if (wholePoints > 0) {
    await useGacha.getState().applyOverdueMoodPenalty(wholePoints);
  }
}

