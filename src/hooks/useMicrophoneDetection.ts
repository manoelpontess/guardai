/**
 * useMicrophoneDetection
 * Usa Web AudioContext (browser) para análise de áudio em tempo real:
 * - Nível de volume em dB
 * - Detecção de som acima do limiar
 * - Detecção de padrão de choro por análise de frequência
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export interface MicLevel {
  db: number;          // -Infinity a 0 dB
  normalized: number;  // 0–100
  isCry: boolean;
  dominantFreq: number; // Hz
}

export interface UseMicrophoneDetectionOptions {
  enabled: boolean;
  thresholdDb?: number;      // alerta acima deste dB (default: -20)
  onSoundAlert?: (level: MicLevel) => void;
  onCryDetected?: (level: MicLevel) => void;
  onLevelUpdate?: (level: MicLevel) => void;
}

export function useMicrophoneDetection({
  enabled,
  thresholdDb = -20,
  onSoundAlert,
  onCryDetected,
  onLevelUpdate,
}: UseMicrophoneDetectionOptions) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const alertCooldownRef = useRef(0);
  const cryWindowRef = useRef<number[]>([]);

  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const analyzeAudio = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const freqArray = new Float32Array(bufferLength);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      // Time domain → RMS → dB
      analyser.getByteTimeDomainData(dataArray);
      let sumSq = 0;
      for (let i = 0; i < bufferLength; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sumSq += norm * norm;
      }
      const rms = Math.sqrt(sumSq / bufferLength);
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
      const normalized = Math.min(100, Math.max(0, Math.round((db + 60) * (100 / 60))));

      // Frequency analysis → find dominant freq → cry detection
      analyser.getFloatFrequencyData(freqArray);
      const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
      let maxVal = -Infinity;
      let maxIdx = 0;
      for (let i = 0; i < freqArray.length; i++) {
        if (freqArray[i] > maxVal) { maxVal = freqArray[i]; maxIdx = i; }
      }
      const dominantFreq = Math.round((maxIdx * sampleRate) / (2 * freqArray.length));

      // Cry: fundamental freq 250–600 Hz, sustained
      const isCryFreq = dominantFreq >= 200 && dominantFreq <= 700;
      const isCryLevel = normalized > 25 && normalized < 90;
      cryWindowRef.current = [...cryWindowRef.current.slice(-14), normalized];
      const avgLevel = cryWindowRef.current.reduce((a, b) => a + b, 0) / cryWindowRef.current.length;
      const variance = cryWindowRef.current.reduce((s, v) => s + Math.pow(v - avgLevel, 2), 0) / cryWindowRef.current.length;
      const isCry = isCryFreq && isCryLevel && avgLevel > 20 && variance > 30 && variance < 800;

      const level: MicLevel = { db, normalized, isCry, dominantFreq };
      onLevelUpdate?.(level);

      const now = Date.now();
      if (normalized > Math.round((thresholdDb + 60) * (100 / 60)) && now - alertCooldownRef.current > 5000) {
        alertCooldownRef.current = now;
        onSoundAlert?.(level);
      }

      if (isCry && now - alertCooldownRef.current > 8000) {
        alertCooldownRef.current = now;
        onCryDetected?.(level);
      }
    };

    tick();
  }, [thresholdDb, onSoundAlert, onCryDetected, onLevelUpdate]);

  const startMic = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicStream(stream);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      setIsActive(true);
      setPermissionDenied(false);
      analyzeAudio();
    } catch (err: any) {
      console.warn('[Mic]', err.name);
      if (err.name === 'NotAllowedError') setPermissionDenied(true);
    }
  }, [analyzeAudio]);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setIsActive(false);
    setMicStream(null);
  }, []);

  useEffect(() => {
    if (enabled) {
      startMic();
    } else {
      stopMic();
    }
    return stopMic;
  }, [enabled]);

  return { isActive, permissionDenied, micStream, startMic, stopMic };
}
