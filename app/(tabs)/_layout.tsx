import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useAppStore } from '../../src/store/appStore';
import { COLORS } from '../../src/utils/theme';

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 20 : 17, opacity: focused ? 1 : 0.45 }}>
      {label}
    </Text>
  );
}

function TabLabel({ text, focused }: { text: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 10, marginTop: 2,
      fontWeight: focused ? '600' : '400',
      color: focused ? COLORS.accent : COLORS.textMuted,
    }}>
      {text}
    </Text>
  );
}

export default function TabsLayout() {
  const getUnreadCount = useAppStore((s) => s.getUnreadCount);
  const unread = getUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg0 },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: COLORS.textPrimary },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg2,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.bg4,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: '🛡 GuardAI',
          title: 'Ao vivo',
          tabBarIcon: ({ focused }) => <Icon label="📹" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Ao vivo" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          headerTitle: 'Câmeras',
          title: 'Câmeras',
          tabBarIcon: ({ focused }) => <Icon label="📷" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Câmeras" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          headerTitle: 'Alertas',
          title: 'Alertas',
          tabBarIcon: ({ focused }) => <Icon label="🔔" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Alertas" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.alert,
            fontSize: 10, minWidth: 16,
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: 'Configurações',
          title: 'Config.',
          tabBarIcon: ({ focused }) => <Icon label="⚙️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel text="Config." focused={focused} />,
        }}
      />
    </Tabs>
  );
}
