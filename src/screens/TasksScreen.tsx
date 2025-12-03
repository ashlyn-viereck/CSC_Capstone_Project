import { View, Text, Pressable, FlatList } from 'react-native';
import { useEffect } from 'react';
import { useTasks } from '../state/useTasks';
import TaskRow from '../components/TaskRow';

export default function TasksScreen({ navigation }: any) {
  const { ready, tasks, refresh } = useTasks();

  useEffect(() => { refresh(); }, []);

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <Text accessibilityRole="header" style={{ fontSize:24, fontWeight:'600' }}>Your tasks</Text>
        <Pressable
          accessibilityLabel="Add task"
          onPress={() => navigation.navigate('AddEditTask')}
          style={{ padding:12, borderRadius:8, borderWidth:1 }}
        >
          <Text>＋ Add</Text>
        </Pressable>
      </View>

      {!ready ? <Text>Loading…</Text> : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          renderItem={({item}) => (
            <TaskRow
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={<Text>No tasks yet. Add one!</Text>}
        />
      )}
    </View>
  );
}
