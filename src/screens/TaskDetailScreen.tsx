import { View, Text, Pressable, Alert } from 'react-native';
import { useTasks } from '../state/useTasks';

export default function TaskDetailScreen({ route, navigation }: any) {
  const id: number = route.params.id;
  const { tasks, remove } = useTasks();
  const task = tasks.find(t => t.id === id);

  if (!task) return <View style={{ padding:16 }}><Text>Task not found.</Text></View>;

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text accessibilityRole="header" style={{ fontSize:24, fontWeight:'700' }}>{task.title}</Text>
      {task.notes ? <Text style={{ marginTop:8 }}>{task.notes}</Text> : null}
      {task.dueAt ? <Text style={{ marginTop:8 }}>Due {new Date(task.dueAt).toLocaleString()}</Text> : null}

      <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
        <Pressable
          accessibilityLabel="Edit task"
          onPress={() => navigation.navigate('AddEditTask', { id })}
          style={{ padding:12, borderWidth:1, borderRadius:8 }}
        ><Text>Edit</Text></Pressable>

        <Pressable
          accessibilityLabel="Delete task"
          onPress={() => Alert.alert('Delete?', 'This cannot be undone.', [
            { text: 'Cancel', style:'cancel' },
            { text: 'Delete', style:'destructive', onPress: async () => { await remove(id); navigation.goBack(); } }
          ])}
          style={{ padding:12, borderWidth:1, borderRadius:8 }}
        ><Text>Delete</Text></Pressable>
      </View>
    </View>
  );
}
