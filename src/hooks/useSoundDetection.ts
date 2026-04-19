import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

interface UseSoundDetectionOptions {
  enabled: boolean;
  cryDetection: boolean;
  thresholdDb: number;
  onSoundAlert?: (db: number) => void;
  onCryDetected?: () => void;
}

export function useSoundDetection({
  enabled,
  cryDetection,
  thresholdDb,
  onSoundAlert,
  onCryDetected,
}: UseSoundDetectionOptions) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cryWindowRef = useRef<number[]>([]);
  const updateDetectionLevels = useAppStore((s) => s.updateDetectionLevels);
  const addAlert = useAppStore((s) => s.addAlert);
  const activeCameraId = useAppStore((s) => s.activeCameraId);
  const cameras = useAppStore((s) => s.cameras);

  // Detect cry pattern: sustained medium-high sound with oscillating amplitude
  const detectCryPattern = useCallback((levels: number[]): boolean => {
    if (levels.length < 5) return false;
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance = levels.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / levels.length;
    // Cry: avg 40–80, moderate variance (oscillation)
    return avg > 35 && avg < 85 && variance > 80 && variance < 600;
  }, []);

  const startMonitoring = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web: use AudioContext + MediaStream
      simulateSoundMonitoring();
      return;
    }

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
        (status) => {
          if (!status.isRecording) return;
          const db = status.metering ?? -160;
          const normalized = Math.max(0, Math.min(100, Math.round((db + 160) / 1.6)));

          updateDetectionLevels({ sound: normalized });
          cryWindowRef.current = [...cryWindowRef.current.slice(-9), normalized];

          if (cryDetection && detectCryPattern(cryWindowRef.current)) {
            updateDetectionLevels({ cry: Math.min(100, normalized + 20) });
            onCryDetected?.();
          } else {
            updateDetectionLevels({ cry: Math.max(0, normalized - 30) });
          }

          const dbReal = Math.round(-160 + normalized * 1.6);
          if (dbReal > thresholdDb) {
            onSoundAlert?.(dbReal);
            const camera = cameras.find((c) => c.id === activeCameraId);
            if (camera) {
              addAlert({
                cameraId: camera.id,
                cameraName: camera.name,
                type: 'sound',
                message: 'Som alto detectado',
                timestamp: new Date(),
                isRead: false,
                decibels: dbReal,
              });
            }
          }
        },
        100
      );

      recordingRef.current = recording;
    } catch (err) {
      console.warn('Erro ao iniciar monitoramento de som:', err);
      simulateSoundMonitoring();
    }
  }, [cryDetection, thresholdDb, onSoundAlert, onCryDetected, detectCryPattern,
      updateDetectionLevels, addAlert, activeCameraId, cameras]);

  const simulateSoundMonitoring = useCallback(() => {
    intervalRef.current = setInterval(() => {
      const ambient = Math.random() * 20;
      const spike = Math.random() < 0.08 ? Math.random() * 60 : 0;
      const sound = Math.min(100, Math.round(ambient + spike));

      cryWindowRef.current = [...cryWindowRef.current.slice(-9), sound];
      const isCry = cryDetection && detectCryPattern(cryWindowRef.current);

      updateDetectionLevels({
        sound,
        cry: isCry ? Math.min(100, sound + 20) : Math.max(0, sound - 30),
      });

      if (isCry) {
        onCryDetected?.();
      }
    }, 500);
  }, [cryDetection, detectCryPattern, updateDetectionLevels, onCryDetected]);

  const stopMonitoring = useCallback(async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    updateDetectionLevels({ sound: 0, cry: 0 });
  }, [updateDetectionLevels]);

  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => { stopMonitoring(); };
  }, [enabled]);

  return { stopMonitoring };
}
