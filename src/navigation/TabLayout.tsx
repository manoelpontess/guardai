import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { COLORS, RADIUS } from '../utils/theme';

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.5 }}>
      {icon}
    </Text>
  );
}

function TabBarLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 10, fontWeight: focused ? '600' : '400',
      color: focused ? COLORS.accent : COLORS.textMuted,
      marginTop: 2,
    }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const getUnreadCount = useAppStore((s) => s.getUnreadCount);
  const unread = getUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg1 },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg2,
          borderTopColor: COLORS.bg4,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ao Vivo',
          headerTitle: '🛡 GuardAI',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📹" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabBarLabel label="Ao vivo" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: 'Câmeras',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📷" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabBarLabel label="Câmeras" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="🔔" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabBarLabel label="Alertas" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.alert,
            color: '#fff',
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="⚙️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabBarLabel label="Config." focused={focused} />,
        }}
      />
    </Tabs>
  );
}
