import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTasks } from '../state/useTasks';

function openAndroidDateTime(
  initial: Date,
  onConfirm: (result: Date) => void
) {
  // 1) pick DATE
  DateTimePickerAndroid.open({
    value: initial,
    mode: 'date', // <-- Android only supports 'date' | 'time'
    onChange: (e, date) => {
      if (e.type === 'dismissed' || !date) return;
      const pickedDate = new Date(date);

      // 2) then pick TIME
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'time',
        is24Hour: false,
        onChange: (e2, time) => {
          if (e2.type === 'dismissed' || !time) return;
          const final = new Date(pickedDate);
          final.setHours(time.getHours(), time.getMinutes(), 0, 0);
          onConfirm(final);
        },
      });
    },
  });
}

export default function AddEditTaskScreen({ navigation, route }: any) {
  const editingId: number | undefined = route?.params?.id;
  const { tasks, add, edit } = useTasks();
  const existing = tasks.find(t => t.id === editingId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [dueAt, setDueAt] = useState<Date | null>(
    existing?.dueAt ? new Date(existing.dueAt) : null
  );
  const [showPicker, setShowPicker] = useState(false);

  const openPicker = () => {
    const initial = dueAt ?? new Date(Date.now() + 60 * 60 * 1000);
    if (Platform.OS === 'android') {
      openAndroidDateTime(initial, setDueAt);
    } else {
      setShowPicker(true); // iOS inline below
    }
  };

  async function onSave() {
    if (!title.trim()) return;
    if (existing) {
      await edit(existing.id, { title: title.trim(), notes, dueAt: dueAt?.getTime() ?? null });
    } else {
      await add({ title: title.trim(), notes, dueAt: dueAt?.getTime() ?? null });
    }
    navigation.goBack();
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>
        {existing ? 'Edit task' : 'New task'}
      </Text>

      <Text style={{ marginTop: 12 }}>Title</Text>
      <TextInput
        accessibilityLabel="Task title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />

      <Text style={{ marginTop: 12 }}>Notes</Text>
      <TextInput
        accessibilityLabel="Task notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ borderWidth: 1, padding: 12, borderRadius: 8, height: 100 }}
      />

      <Pressable
        accessibilityLabel="Set due date"
        onPress={openPicker}
        style={{ marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 8 }}
      >
        <Text>{dueAt ? `Due: ${dueAt.toLocaleString()}` : 'Set due date & time'}</Text>
      </Pressable>

      {/* iOS inline picker with real datetime mode */}
      {showPicker && Platform.OS !== 'android' && (
        <DateTimePicker
          value={dueAt ?? new Date(Date.now() + 60 * 60 * 1000)}
          mode="datetime"
          display="default"
          onChange={(_e, d) => {
            if (d) setDueAt(d);
            // keep open on iOS until user taps elsewhere; or setShowPicker(false) if you prefer
          }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onSave}
        style={{ marginTop: 20, padding: 14, backgroundColor: '#111', borderRadius: 10 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
          {existing ? 'Save changes' : 'Create task'}
        </Text>
      </Pressable>
    </View>
  );
}
