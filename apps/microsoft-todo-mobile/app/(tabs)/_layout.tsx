import React from 'react';
import { Tabs } from 'expo-router';
import { useUiStore } from '../../src/store/useUiStore';
import { AppBottomBar } from '../../src/components/AppBottomBar';

export default function TabLayout() {
  const { isDarkMode } = useUiStore();

  return (
    <Tabs
      tabBar={(props) => <AppBottomBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: isDarkMode ? '#09090b' : '#f8fafc',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="important" options={{ title: 'Important' }} />
      <Tabs.Screen name="assigned" options={{ title: 'Assigned' }} />
      <Tabs.Screen name="lists" options={{ title: 'Lists' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
