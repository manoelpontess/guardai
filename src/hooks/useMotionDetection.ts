import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';

interface UseMotionDetectionOptions {
  enabled: boolean;
  sensitivity: number; // 1–10
  onMotionDetected?: (level: number) => void;
}

export function useMotionDetection({
  enabled,
  sensitivity,
  onMotionDetected,
}: UseMotionDetectionOptions) {
  const prevFrameRef = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateDetectionLevels = useAppStore((s) => s.updateDetectionLevels);
  const addAlert = useAppStore((s) => s.addAlert);
  const activeCameraId = useAppStore((s) => s.activeCameraId);
  const cameras = useAppStore((s) => s.cameras);

  // Simulated motion analysis (replace with real frame diff in production)
  const analyzeMotion = useCallback(() => {
    if (!enabled) return;

    // Simulate realistic motion levels
    const baseNoise = Math.random() * 8;
    const motionSpike = Math.random() < 0.05 ? Math.random() * 60 : 0;
    const motionLevel = Math.min(100, Math.round(baseNoise + motionSpike * (sensitivity / 10)));

    updateDetectionLevels({ motion: motionLevel });

    const threshold = 100 - sensitivity * 9;
    if (motionLevel > threshold) {
      onMotionDetected?.(motionLevel);
      const camera = cameras.find((c) => c.id === activeCameraId);
      if (camera) {
        addAlert({
          cameraId: camera.id,
          cameraName: camera.name,
          type: 'motion',
          message: 'Movimento detectado',
          timestamp: new Date(),
          isRead: false,
        });
      }
    }
  }, [enabled, sensitivity, onMotionDetected, updateDetectionLevels, addAlert, activeCameraId, cameras]);

  // Real frame-diff implementation for web
  const analyzeFrame = useCallback((video: HTMLVideoElement) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (prevFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        diff += Math.abs(currentFrame.data[i] - prevFrameRef.current.data[i]);
        diff += Math.abs(currentFrame.data[i + 1] - prevFrameRef.current.data[i + 1]);
        diff += Math.abs(currentFrame.data[i + 2] - prevFrameRef.current.data[i + 2]);
      }
      const score = Math.min(100, Math.round(diff / (canvas.width * canvas.height * 3) * 10));
      updateDetectionLevels({ motion: score });

      const threshold = 100 - sensitivity * 9;
      if (score > threshold) {
        onMotionDetected?.(score);
      }
    }

    prevFrameRef.current = currentFrame;
  }, [sensitivity, onMotionDetected, updateDetectionLevels]);

  useEffect(() => {
    if (!enabled) {
      updateDetectionLevels({ motion: 0 });
      return;
    }

    intervalRef.current = setInterval(analyzeMotion, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, analyzeMotion, updateDetectionLevels]);

  return { analyzeFrame };
}
