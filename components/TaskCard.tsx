import { View, Text, Pressable } from "react-native";
import { type Task } from "@/lib/db";
import MascotSticker from "./MascotSticker";

export default function TaskCard({
  task,
  onToggleDone,
  onPress,
}: {
  task: Task;
  onToggleDone: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
        backgroundColor: task.done ? "#E5E7EB" : "#FFFFFF",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <MascotSticker level={task.intensity} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700" }}>{task.title}</Text>
          {task.dueISO ? (
            <Text style={{ opacity: 0.7 }}>
              Due: {new Date(task.dueISO).toLocaleString()}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onToggleDone}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: task.done ? "#FCA5A5" : "#6EE7B7",
            borderRadius: 10,
          }}
        >
          <Text>{task.done ? "Undo" : "Done"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
