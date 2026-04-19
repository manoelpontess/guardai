/**
 * useVideoRecorder
 * Web: MediaRecorder API — grава diretamente do stream da webcam
 * Native: expo-av Camera recording
 */
import { useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export type RecordingState = 'idle' | 'recording' | 'saving' | 'saved' | 'error';

export interface RecordedClip {
  id: string;
  url: string;       // blob URL (web) or file URI (native)
  blob?: Blob;
  timestamp: Date;
  durationSecs: number;
  thumbnailUrl?: string;
  triggerType: 'manual' | 'motion' | 'sound' | 'cry';
  cameraName: string;
  sizeBytes?: number;
}

export interface UseVideoRecorderReturn {
  state: RecordingState;
  clips: RecordedClip[];
  currentDuration: number;
  startRecording: (stream: MediaStream, triggerType?: RecordedClip['triggerType'], cameraName?: string) => void;
  stopRecording: () => Promise<RecordedClip | null>;
  deleteClip: (id: string) => void;
  downloadClip: (clip: RecordedClip) => void;
  clearAllClips: () => void;
  error: string;
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metaRef = useRef<{ triggerType: RecordedClip['triggerType']; cameraName: string }>({
    triggerType: 'manual',
    cameraName: 'Câmera',
  });

  const [state, setState] = useState<RecordingState>('idle');
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [error, setError] = useState('');

  const startRecording = useCallback((
    stream: MediaStream,
    triggerType: RecordedClip['triggerType'] = 'manual',
    cameraName = 'Câmera',
  ) => {
    if (Platform.OS !== 'web') return;
    if (state === 'recording') return;

    try {
      chunksRef.current = [];
      metaRef.current = { triggerType, cameraName };
      startTimeRef.current = new Date();
      setCurrentDuration(0);
      setError('');

      // Pick best supported codec
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 2_500_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (e: any) => {
        setError(`Erro de gravação: ${e.error?.message ?? 'desconhecido'}`);
        setState('error');
      };

      recorder.start(500); // collect chunks every 500ms
      mediaRecorderRef.current = recorder;
      setState('recording');

      // Duration counter
      timerRef.current = setInterval(() => {
        setCurrentDuration(Math.round((Date.now() - startTimeRef.current.getTime()) / 1000));
      }, 1000);
    } catch (err: any) {
      setError(`Não foi possível iniciar gravação: ${err.message}`);
      setState('error');
    }
  }, [state]);

  const stopRecording = useCallback(async (): Promise<RecordedClip | null> => {
    if (!mediaRecorderRef.current || state !== 'recording') return null;

    setState('saving');
    if (timerRef.current) clearInterval(timerRef.current);

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        const duration = Math.round((Date.now() - startTimeRef.current.getTime()) / 1000);
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Generate thumbnail from first frame
        let thumbnailUrl: string | undefined;
        try {
          thumbnailUrl = await extractThumbnail(url);
        } catch (_) {}

        const clip: RecordedClip = {
          id: Date.now().toString(),
          url,
          blob,
          timestamp: startTimeRef.current,
          durationSecs: duration,
          thumbnailUrl,
          triggerType: metaRef.current.triggerType,
          cameraName: metaRef.current.cameraName,
          sizeBytes: blob.size,
        };

        setClips((prev) => [clip, ...prev]);
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
        resolve(clip);
      };

      recorder.stop();
    });
  }, [state]);

  const deleteClip = useCallback((id: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip?.url) URL.revokeObjectURL(clip.url);
      if (clip?.thumbnailUrl) URL.revokeObjectURL(clip.thumbnailUrl);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const downloadClip = useCallback((clip: RecordedClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    const ext = clip.blob?.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `guardai_${clip.cameraName}_${clip.timestamp.toISOString().replace(/[:.]/g, '-')}.${ext}`;
    a.click();
  }, []);

  const clearAllClips = useCallback(() => {
    setClips((prev) => {
      prev.forEach((c) => {
        if (c.url) URL.revokeObjectURL(c.url);
        if (c.thumbnailUrl) URL.revokeObjectURL(c.thumbnailUrl);
      });
      return [];
    });
  }, []);

  return {
    state,
    clips,
    currentDuration,
    startRecording,
    stopRecording,
    deleteClip,
    downloadClip,
    clearAllClips,
    error,
  };
}

async function extractThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.currentTime = 0.1;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      video.remove();
    };
    video.onerror = reject;
  });
}
