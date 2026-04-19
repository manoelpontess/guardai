import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Alert, Camera } from '../store/appStore';

const KEYS = {
  SETTINGS: 'guardai:settings',
  CAMERAS: 'guardai:cameras',
  ALERTS: 'guardai:alerts',
  ONBOARDED: 'guardai:onboarded',
};

export const storage = {
  // Settings
  async saveSettings(settings: Settings): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  async loadSettings(): Promise<Settings | null> {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : null;
  },

  // Cameras
  async saveCameras(cameras: Camera[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CAMERAS, JSON.stringify(cameras));
  },

  async loadCameras(): Promise<Camera[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.CAMERAS);
    if (!raw) return null;
    const cameras = JSON.parse(raw) as Camera[];
    // Restore Date objects
    return cameras.map((c) => ({ ...c, lastSeen: new Date(c.lastSeen) }));
  },

  // Alerts (keep last 200)
  async saveAlerts(alerts: Alert[]): Promise<void> {
    const toSave = alerts.slice(0, 200);
    await AsyncStorage.setItem(KEYS.ALERTS, JSON.stringify(toSave));
  },

  async loadAlerts(): Promise<Alert[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.ALERTS);
    if (!raw) return null;
    const alerts = JSON.parse(raw) as Alert[];
    return alerts.map((a) => ({ ...a, timestamp: new Date(a.timestamp) }));
  },

  // Onboarding
  async markOnboarded(): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDED, '1');
  },

  async isOnboarded(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.ONBOARDED)) === '1';
  },

  // Clear all
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
