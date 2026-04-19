import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

export type CamStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'insecure';

interface WebCameraViewProps {
  style?: any;
  onStatusChange?: (status: CamStatus) => void;
  onStream?: (stream: MediaStream | null) => void;
  children?: React.ReactNode;
  isRecording?: boolean;
}

export function WebCameraView({ style, onStatusChange, onStream, children, isRecording }: WebCameraViewProps) {
  if (Platform.OS !== 'web') return null;
  return (
    <WebCameraViewInner
      style={style}
      onStatusChange={onStatusChange}
      onStream={onStream}
      isRecording={isRecording}
    >
      {children}
    </WebCameraViewInner>
  );
}

function WebCameraViewInner({ style, onStatusChange, onStream, children, isRecording }: WebCameraViewProps) {
  const containerRef = useRef<any>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const updateStatus = useCallback((s: CamStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoElRef.current) videoElRef.current.srcObject = null;
  }, []);

  // Check if getUserMedia is available (requires HTTPS or localhost)
  const isSecureContext = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';
    const isHttps = window.location.protocol === 'https:';
    const hasGetUserMedia =
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices != null &&
      typeof navigator.mediaDevices.getUserMedia === 'function';
    return (isLocalhost || isHttps) && hasGetUserMedia;
  }, []);

  const startStream = useCallback(async (deviceId?: string) => {
    // Check for secure context first
    if (!isSecureContext()) {
      updateStatus('insecure');
      setErrorMsg(
        'Câmera requer HTTPS ou localhost.\n\n' +
        'Acesse pelo computador em:\nhttp://localhost:8081\n\n' +
        'No iPhone/Android, use o app nativo com Expo Go — escaneie o QR code no terminal.'
      );
      return;
    }

    updateStatus('requesting');
    setErrorMsg('');
    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        videoElRef.current.onloadedmetadata = () => {
          videoElRef.current?.play().catch(console.warn);
        };
      }

      // Get active device label
      const track = stream.getVideoTracks()[0];
      const trackSettings = track?.getSettings();
      if (trackSettings?.deviceId) setActiveDeviceId(trackSettings.deviceId);

      // List all cameras
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter((d) => d.kind === 'videoinput'));

      updateStatus('active');
    } catch (err: any) {
      console.error('[WebCam]', err.name, err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        updateStatus('denied');
        setErrorMsg('Permissão negada.\nClique no ícone 🔒 na barra de endereço e permita a câmera.');
      } else if (err.name === 'NotFoundError') {
        updateStatus('error');
        setErrorMsg('Nenhuma webcam detectada.\nVerifique se está conectada e ativa.');
      } else if (err.name === 'NotReadableError') {
        updateStatus('error');
        setErrorMsg('Câmera em uso por outro programa.\nFeche-o e tente novamente.');
      } else {
        updateStatus('error');
        setErrorMsg(`Erro: ${err.message}`);
      }
    }
  }, [isSecureContext, stopStream, updateStatus]);

  const switchDevice = useCallback(async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    setShowDevicePicker(false);
    await startStream(deviceId);
  }, [startStream]);

  // Inject <video> into DOM node after mount
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #060b18;
      display: block;
    `;
    videoElRef.current = video;

    // Attach video to DOM after RN renders the View
    const timer = setTimeout(() => {
      const node = containerRef.current as HTMLElement | null;
      if (node) {
        node.style.position = 'relative';
        node.style.overflow = 'hidden';
        node.appendChild(video);
      }
      startStream();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopStream();
      video.remove();
    };
  }, []); // eslint-disable-line

  return (
    <View ref={containerRef} style={[styles.container, style]}>

      {/* Insecure context (HTTP on mobile) */}
      {status === 'insecure' && (
        <View style={styles.overlay}>
          <Text style={styles.errorIcon}>🔐</Text>
          <Text style={styles.errorTitle}>Câmera requer HTTPS</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Como usar a câmera:</Text>
            <Text style={styles.tipText}>• No computador: acesse localhost:8081</Text>
            <Text style={styles.tipText}>• No celular: use o app Expo Go</Text>
            <Text style={styles.tipText}>• Em produção: faça deploy com HTTPS</Text>
          </View>
        </View>
      )}

      {/* Loading */}
      {status === 'requesting' && (
        <View style={styles.overlay}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.overlayText}>Acessando câmera...</Text>
        </View>
      )}

      {/* Error / Denied */}
      {(status === 'denied' || status === 'error') && (
        <View style={styles.overlay}>
          <Text style={styles.errorIcon}>{status === 'denied' ? '🔒' : '📵'}</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => startStream()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.startBtn} onPress={() => startStream()}>
            <Text style={styles.startIcon}>📷</Text>
            <Text style={styles.startText}>Ativar câmera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active: overlay children + controls */}
      {status === 'active' && children}

      {/* Camera switcher */}
      {status === 'active' && devices.length > 1 && (
        <View style={styles.switcherWrap}>
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setShowDevicePicker((v) => !v)}
          >
            <Text style={styles.switcherIcon}>🔄</Text>
          </TouchableOpacity>
          {showDevicePicker && (
            <View style={styles.deviceList}>
              {devices.map((d, i) => (
                <TouchableOpacity
                  key={d.deviceId}
                  style={[styles.deviceItem, d.deviceId === activeDeviceId && styles.deviceItemActive]}
                  onPress={() => switchDevice(d.deviceId)}
                >
                  <Text style={[styles.deviceItemText, d.deviceId === activeDeviceId && { color: COLORS.accent }]}>
                    {d.label || `Câmera ${i + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* REC border */}
      {isRecording && status === 'active' && (
        <View style={styles.recBorder} pointerEvents="none" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%', height: '100%',
    backgroundColor: '#060b18',
    overflow: 'hidden', position: 'relative',
  } as any,
  overlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#060b18',
    padding: SPACING.xl, gap: SPACING.md,
  } as any,
  overlayText: { color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.sm },
  errorIcon: { fontSize: 36 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  tipBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    borderWidth: 0.5, borderColor: COLORS.bg4,
    padding: SPACING.md, width: '100%',
    gap: 4,
  },
  tipTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  tipText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accent,
  },
  retryText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  startBtn: {
    alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl,
    borderRadius: RADIUS.xl, borderWidth: 0.5,
    borderColor: COLORS.bg4, backgroundColor: COLORS.bg3,
  },
  startIcon: { fontSize: 32 },
  startText: { color: COLORS.textSecondary, fontSize: 14 },
  switcherWrap: {
    position: 'absolute', bottom: SPACING.md, right: SPACING.md,
    zIndex: 20, alignItems: 'flex-end',
  } as any,
  switcherBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(6,11,24,0.8)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  switcherIcon: { fontSize: 14 },
  deviceList: {
    marginTop: 6, backgroundColor: COLORS.bg2,
    borderRadius: RADIUS.md, borderWidth: 0.5,
    borderColor: COLORS.bg4, overflow: 'hidden', minWidth: 180,
  },
  deviceItem: { padding: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4 },
  deviceItemActive: { backgroundColor: COLORS.accentDim },
  deviceItemText: { color: COLORS.textSecondary, fontSize: 12 },
  recBorder: {
    position: 'absolute', inset: 0,
    borderWidth: 2, borderColor: COLORS.alert,
    borderRadius: RADIUS.lg, zIndex: 5,
  } as any,
});
