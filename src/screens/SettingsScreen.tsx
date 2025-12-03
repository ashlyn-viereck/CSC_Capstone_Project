import { View, Text, Pressable } from 'react-native';
import { useEffect } from 'react';
import { useSettings, type NotifIntensity, type ToneMode } from '../state/useSettings';
import { allTasks, updateTask } from '../data/db';
import { cancelTaskNotifications, scheduleTaskNotifications } from '../data/notifications';

const MODES: NotifIntensity[] = ['OFF','LIGHT','STANDARD','FOCUSED','INTENSE'];
const TONES: ToneMode[] = ['NEUTRAL','CARING','MANIPULATIVE'];

export default function SettingsScreen() {
  const { notifIntensity, setNotifIntensity, toneMode, setToneMode, hydrate } = useSettings();

  useEffect(() => { hydrate(); }, []);

  async function applyMode(m: NotifIntensity) {
    await setNotifIntensity(m);
    // Reschedule all existing tasks to match the new intensity
    const tasks = await allTasks();
    for (const t of tasks) {
      try {
        const prev = t.notifId ? JSON.parse(t.notifId) : [];
        await cancelTaskNotifications(Array.isArray(prev) ? prev : []);
      } catch {}
      const ids = await scheduleTaskNotifications(t, m, 'default');
      await updateTask(t.id, { notifId: JSON.stringify(ids) });
    }
  }

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text accessibilityRole="header" style={{ fontSize:22, fontWeight:'700' }}>Settings</Text>

      <Text style={{ marginTop:16, fontWeight:'600' }}>Notification intensity</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
        {MODES.map(m => (
          <Pressable
            key={m}
            onPress={() => applyMode(m)}
            style={{
              paddingVertical:8, paddingHorizontal:12, borderWidth:1, borderRadius:8,
              backgroundColor: notifIntensity === m ? '#111' : 'transparent'
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: notifIntensity === m }}
          >
            <Text style={{ color: notifIntensity === m ? '#fff' : '#000' }}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ marginTop:8, opacity:0.7 }}>
        OFF: none • LIGHT: 1h • STANDARD: 1d + 1h • FOCUSED: 2d,12h,1h,15m • INTENSE: adds 30m,10m,5m
      </Text>

      <Text style={{ marginTop:16, fontWeight:'600' }}>Notification tone</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
        {TONES.map(t => (
          <Pressable
            key={t}
            onPress={() => setToneMode(t)}
            style={{
              paddingVertical:8, paddingHorizontal:12, borderWidth:1, borderRadius:8,
              backgroundColor: toneMode === t ? '#111' : 'transparent'
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: toneMode === t }}
          >
            <Text style={{ color: toneMode === t ? '#fff' : '#000' }}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ marginTop:8, opacity:0.7 }}>
        Neutral: factual • Caring: encouraging • Manipulative: guilt-trip escalation
      </Text>
    </View>
  );
}
