import { View, Text, Pressable } from 'react-native';
import { useTasks } from '../state/useTasks';
import { Task } from '../data/db';

export default function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const { toggleComplete } = useTasks();
  return (
    <Pressable onPress={onPress} accessibilityHint="Opens task details"
      style={{ padding:12, borderBottomWidth:1, borderColor:'#eee', flexDirection:'row', justifyContent:'space-between' }}>
      <View style={{ maxWidth:'75%' }}>
        <Text accessibilityRole="text" style={{ fontWeight:'600', textDecorationLine: task.completed ? 'line-through':'none' }}>
          {task.title}
        </Text>
        {task.dueAt ? <Text>Due {new Date(task.dueAt).toLocaleString()}</Text> : null}
      </View>
      <Pressable
        accessibilityLabel={task.completed ? "Mark incomplete" : "Mark complete"}
        onPress={() => toggleComplete(task.id)}
        hitSlop={10}
        style={{ paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderRadius:8 }}
      >
        <Text>{task.completed ? '✓' : '○'}</Text>
      </Pressable>
    </Pressable>
  );
}
