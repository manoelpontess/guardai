import { create } from 'zustand';

export type CameraMode = 'security' | 'baby';
export type AlertType = 'motion' | 'sound' | 'cry' | 'connection';

export interface Camera {
  id: string;
  name: string;
  deviceName: string;
  isOnline: boolean;
  isRecording: boolean;
  quality: '720p' | '1080p' | '4K';
  mode: CameraMode;
  lastSeen: Date;
}

export interface Alert {
  id: string;
  cameraId: string;
  cameraName: string;
  type: AlertType;
  message: string;
  timestamp: Date;
  isRead: boolean;
  clipPath?: string;
  durationSecs?: number;
  decibels?: number;
}

export interface DetectionLevels {
  motion: number;   // 0–100
  sound: number;    // 0–100
  cry: number;      // 0–100
}

export interface Settings {
  motionDetection: boolean;
  soundDetection: boolean;
  cryDetection: boolean;
  nightVision: boolean;
  cloudBackup: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  quietHours: boolean;
  quietStart: string;  // "23:00"
  quietEnd: string;    // "07:00"
  motionSensitivity: number; // 1–10
  soundThresholdDb: number;  // 50–90
  videoQuality: '720p' | '1080p' | '4K';
  twoWayAudio: boolean;
  autoRecord: boolean;
  flashlightOnAlert: boolean;
}

interface AppState {
  cameras: Camera[];
  alerts: Alert[];
  detectionLevels: DetectionLevels;
  activeCameraId: string | null;
  isMonitoring: boolean;
  settings: Settings;
  babyModeActive: boolean;
  isMicActive: boolean;
  isRecording: boolean;

  // Actions
  setActiveCameraId: (id: string | null) => void;
  toggleMonitoring: () => void;
  toggleBabyMode: () => void;
  toggleMic: () => void;
  toggleRecording: () => void;
  addAlert: (alert: Omit<Alert, 'id'>) => void;
  markAlertRead: (id: string) => void;
  markAllRead: () => void;
  updateDetectionLevels: (levels: Partial<DetectionLevels>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  updateCamera: (id: string, update: Partial<Camera>) => void;
  addCamera: (camera: Omit<Camera, 'id'>) => void;
  removeCamera: (id: string) => void;
  getUnreadCount: () => number;
}

const defaultSettings: Settings = {
  motionDetection: true,
  soundDetection: true,
  cryDetection: true,
  nightVision: false,
  cloudBackup: false,
  pushNotifications: true,
  emailNotifications: false,
  quietHours: false,
  quietStart: '23:00',
  quietEnd: '07:00',
  motionSensitivity: 6,
  soundThresholdDb: 70,
  videoQuality: '1080p',
  twoWayAudio: true,
  autoRecord: true,
  flashlightOnAlert: false,
};

const mockAlerts: Alert[] = [
  {
    id: '1', cameraId: 'cam2', cameraName: 'Quarto do bebê',
    type: 'cry', message: 'Choro detectado', timestamp: new Date(Date.now() - 8 * 60000),
    isRead: false, durationSecs: 42,
  },
  {
    id: '2', cameraId: 'cam1', cameraName: 'Sala principal',
    type: 'motion', message: 'Movimento detectado', timestamp: new Date(Date.now() - 34 * 60000),
    isRead: false,
  },
  {
    id: '3', cameraId: 'cam1', cameraName: 'Sala principal',
    type: 'sound', message: 'Som alto detectado', timestamp: new Date(Date.now() - 60 * 60000),
    isRead: false, decibels: 78,
  },
  {
    id: '4', cameraId: 'cam3', cameraName: 'Entrada',
    type: 'motion', message: 'Movimento detectado', timestamp: new Date(Date.now() - 23 * 3600000),
    isRead: true,
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  cameras: [
    {
      id: 'cam1', name: 'Sala principal', deviceName: 'Este dispositivo',
      isOnline: true, isRecording: false, quality: '1080p',
      mode: 'security', lastSeen: new Date(),
    },
    {
      id: 'cam2', name: 'Quarto do bebê', deviceName: 'iPhone 13',
      isOnline: true, isRecording: false, quality: '1080p',
      mode: 'baby', lastSeen: new Date(),
    },
    {
      id: 'cam3', name: 'Entrada', deviceName: 'Samsung Galaxy S21',
      isOnline: false, isRecording: false, quality: '720p',
      mode: 'security', lastSeen: new Date(Date.now() - 86400000),
    },
  ],
  alerts: mockAlerts,
  detectionLevels: { motion: 12, sound: 28, cry: 4 },
  activeCameraId: 'cam1',
  isMonitoring: true,
  settings: defaultSettings,
  babyModeActive: false,
  isMicActive: false,
  isRecording: false,

  setActiveCameraId: (id) => set({ activeCameraId: id }),
  toggleMonitoring: () => set((s) => ({ isMonitoring: !s.isMonitoring })),
  toggleBabyMode: () => set((s) => ({ babyModeActive: !s.babyModeActive })),
  toggleMic: () => set((s) => ({ isMicActive: !s.isMicActive })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),

  addAlert: (alert) =>
    set((s) => ({
      alerts: [{ ...alert, id: Date.now().toString() }, ...s.alerts],
    })),

  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    })),

  markAllRead: () =>
    set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, isRead: true })) })),

  updateDetectionLevels: (levels) =>
    set((s) => ({ detectionLevels: { ...s.detectionLevels, ...levels } })),

  updateSettings: (settings) =>
    set((s) => ({ settings: { ...s.settings, ...settings } })),

  updateCamera: (id, update) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...update } : c)),
    })),

  addCamera: (camera) =>
    set((s) => ({
      cameras: [...s.cameras, { ...camera, id: Date.now().toString() }],
    })),

  removeCamera: (id) =>
    set((s) => ({ cameras: s.cameras.filter((c) => c.id !== id) })),

  getUnreadCount: () => get().alerts.filter((a) => !a.isRead).length,
}));
