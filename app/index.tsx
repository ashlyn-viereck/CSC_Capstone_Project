import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Switch, Platform, KeyboardAvoidingView, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { Link, useRouter } from "expo-router";

import MascotSticker from "@/components/MascotSticker";      // using the emoji fallback you added
import TaskCard from "@/components/TaskCard";
import { useThemeCtx } from "@/lib/theme";
import { useGamification } from "@/lib/gamification";
import { dbInit, getTasks, addTask, toggleDone, type Task } from "@/lib/db";
import { scheduleForTask, cancelNotificationsForTask } from "@/lib/notifications";

/** Loud visible header so you can confirm native rendering */
const Banner = () => (
  <View style={{ padding: 16, backgroundColor: "#10B981", borderRadius: 12, marginBottom: 12 }}>
    <Text style={{ fontSize: 22, fontWeight: "800", color: "#0B1020" }}>👹 Cryptid Planner (Native)</Text>
    <Text>If you see this, rendering works. Add a task below to test notifications.</Text>
  </View>
);

export default function Home() {
  const [title, setTitle] = useState("");
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [dueISO, setDueISO] = useState(""); // optional ISO string; you can leave it blank
  const [tasks, setTasks] = useState<Task[]>([]);

  const { theme, toggleTheme } = useThemeCtx();
  const gamify = useGamification();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await dbInit();
        await refresh();
      } catch (e) {
        console.warn("Database init failed (web fallback will be used or check native):", e);
      }

      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn("Notifications permission not granted");
        }
      } catch (e) {
        // Notifications may not be available on web; don't crash the app
        console.warn("Notifications setup failed (possible on web):", e);
      }
    })();
  }, []);

  async function refresh() {
    setTasks(await getTasks());
  }

  async function onAdd() {
    if (!title.trim()) {
      Alert.alert("Add a title first");
      return;
    }
    const id = await addTask({ title: title.trim(), intensity, dueISO: dueISO.trim() || undefined });
    await scheduleForTask({ id, title: title.trim(), intensity, dueISO: dueISO.trim() || undefined });
    setTitle("");
    setDueISO("");
    setIntensity(2);
    refresh();
  }

  async function onToggleDone(t: Task) {
    await toggleDone(t.id, !t.done);
    if (!t.done) {
      gamify.awardCompletion(t.intensity);
      await cancelNotificationsForTask(t.id);
    }
    refresh();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Banner />

        {/* Top bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 24, fontWeight: "800" }}>Cryptid Planner</Text>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Link href="/gacha"><Text style={{ textDecorationLine: "underline" }}>Gacha</Text></Link>
            <Link href="/settings"><Text style={{ textDecorationLine: "underline" }}>Settings</Text></Link>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text>{theme === "light" ? "Light" : "Dark"}</Text>
              <Switch value={theme === "dark"} onValueChange={toggleTheme} />
            </View>
          </View>
        </View>

        {/* Task title */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            placeholder="New task title"
            value={title}
            onChangeText={setTitle}
            style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
          />
          <Pressable
            onPress={async () => {
              // 5-second test notification to verify end-to-end
              await Notifications.scheduleNotificationAsync({
                content: { title: "Test ping", body: "Fires in 5 seconds 🔔" },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false },
              });
            }}
            style={{ backgroundColor: "#FDE68A", padding: 10, borderRadius: 10 }}
          >
            <Text>Test ping</Text>
          </Pressable>
        </View>

        {/* Optional due date/time as ISO text (can be blank) */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text>Due ISO:</Text>
          <TextInput
            placeholder="2025-11-10T18:00:00.000Z (optional)"
            value={dueISO}
            onChangeText={setDueISO}
            style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Intensity picker + Add */}
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text>Intensity:</Text>
          {[1, 2, 3].map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setIntensity(lvl as 1 | 2 | 3)}
              style={{ padding: 8, borderWidth: intensity === lvl ? 2 : 1, borderRadius: 12 }}
            >
              <MascotSticker level={lvl as 1 | 2 | 3} />
            </Pressable>
          ))}
          <Pressable
            onPress={onAdd}
            style={{ marginLeft: "auto", backgroundColor: "#6EE7B7", padding: 10, borderRadius: 10 }}
          >
            <Text style={{ fontWeight: "700" }}>Add Task</Text>
          </Pressable>
        </View>

        {/* Task list */}
        <FlatList
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggleDone={() => onToggleDone(item)}
              onPress={() => router.push(`/task/${item.id}`)}
            />
          )}
          ListEmptyComponent={<Text style={{ opacity: 0.6 }}>No tasks yet. Add one above.</Text>}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          style={{ marginTop: 12 }}
        />

        {/* Points / Streak */}
        <View style={{ padding: 12, borderWidth: 1, borderRadius: 12, marginTop: 12 }}>
          <Text>Points: {gamify.points} • Streak: {gamify.streak} days • Daily chest in: {gamify.dailyCountdown()}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
