import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TasksScreen from '../screens/TasksScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import AddEditTaskScreen from '../screens/AddEditTaskScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import GameScreen from '../screens/GameScreen';
import ShopScreen from '../screens/ShopScreen';
import PetScreen from '../screens/PetScreen';
import { useAuth } from '../state/useAuth';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TasksStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TasksHome" component={TasksScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      <Stack.Screen name="AddEditTask" component={AddEditTaskScreen} options={{ title: 'Add/Edit' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Tasks" component={TasksStack} />
      <Tabs.Screen name="Game" component={GameScreen} />
      <Tabs.Screen name="Pet" component={PetScreen} />
      <Tabs.Screen name="Shop" component={ShopScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Welcome' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
