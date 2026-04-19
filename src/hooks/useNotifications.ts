import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlertType } from '../store/appStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificação recebida:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notificação tocada:', response);
      }
    );

    return () => {
      if (notificationListener.current)
        Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return { sendAlert };
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('guardai-alerts', {
      name: 'GuardAI Alertas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4ff',
    });
  }
}

export async function sendAlert(type: AlertType, cameraName: string, details?: string) {
  const configs: Record<AlertType, { title: string; icon: string }> = {
    motion: { title: '🔴 Movimento Detectado', icon: '👁' },
    sound: { title: '🔊 Som Alto Detectado', icon: '🎙' },
    cry: { title: '👶 Choro Detectado', icon: '👶' },
    connection: { title: '📡 Câmera Offline', icon: '📡' },
  };

  const config = configs[type];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: config.title,
      body: `${cameraName}${details ? ' — ' + details : ''}`,
      data: { type, cameraName },
      sound: true,
      badge: 1,
    },
    trigger: null,
  });
}
