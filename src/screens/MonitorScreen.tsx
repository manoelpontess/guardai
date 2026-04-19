import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppStore } from '../store/appStore';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useMicrophoneDetection } from '../hooks/useMicrophoneDetection';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { sendAlert } from '../hooks/useNotifications';
import { applyNightVisionToVideoEl } from '../utils/nightVision';
import {
  LiveBadge, MetricBar, StatCard,
  IconButton, SectionHeader, GlowCard,
} from '../components/UIComponents';
import { WebCameraView, CamStatus } from '../components/WebCameraView';
import { MultiCameraGrid } from '../components/MultiCameraGrid';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function MonitorScreen() {
  useKeepAwake();

  const [permission, requestPermission] = useCameraPermissions();
  const [currentTime, setCurrentTime] = useState('');
  const [uptime, setUptime] = useState(0);
  const [webCamStatus, setWebCamStatus] = useState<CamStatus>('idle');
  const [showGrid, setShowGrid] = useState(false);
  const [nightVisionOn, setNightVisionOn] = useState(false);
  const [webStream, setWebStream] = useState<MediaStream | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    isMonitoring, babyModeActive, isMicActive, isRecording,
    settings, detectionLevels, cameras, activeCameraId,
    toggleMonitoring, toggleBabyMode, toggleMic, toggleRecording,
    alerts, updateSettings, updateDetectionLevels,
  } = useAppStore();

  const activeCamera = cameras.find((c) => c.id === activeCameraId);

  // ── Video recorder ─────────────────────────────────────────────────────────
  const recorder = useVideoRecorder();

  // ── Real microphone detection ──────────────────────────────────────────────
  useMicrophoneDetection({
    enabled: isMicActive && isMonitoring,
    thresholdDb: -25,
    onLevelUpdate: (level) => {
      updateDetectionLevels({
        sound: level.normalized,
        cry: level.isCry ? Math.min(100, level.normalized + 20) : Math.max(0, level.normalized - 30),
      });
    },
    onSoundAlert: (level) => {
      if (settings.pushNotifications && activeCamera) {
        sendAlert('sound', activeCamera.name, `${Math.round(level.db + 96)} dB`);
      }
    },
    onCryDetected: () => {
      if (settings.pushNotifications && activeCamera) {
        sendAlert('cry', activeCamera.name);
      }
    },
  });

  // ── Motion detection ───────────────────────────────────────────────────────
  const onMotionDetected = useCallback(() => {
    if (settings.pushNotifications && activeCamera) sendAlert('motion', activeCamera.name);
    // Auto-record on motion
    if (settings.autoRecord && webStream && recorder.state === 'idle') {
      recorder.startRecording(webStream, 'motion', activeCamera?.name ?? 'Câmera');
      setTimeout(() => recorder.stopRecording(), 30000); // 30s clip
    }
  }, [settings, activeCamera, webStream, recorder]);

  useMotionDetection({
    enabled: isMonitoring && settings.motionDetection,
    sensitivity: settings.motionSensitivity,
    onMotionDetected,
  });

  // ── Live clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
      setUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── REC pulse ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isRecording]);

  // ── Night vision ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') applyNightVisionToVideoEl(nightVisionOn);
  }, [nightVisionOn]);

  // ── Handle manual record toggle ────────────────────────────────────────────
  const handleRecordToggle = useCallback(async () => {
    if (recorder.state === 'recording') {
      const clip = await recorder.stopRecording();
      if (clip) toggleRecording();
    } else if (webStream) {
      recorder.startRecording(webStream, 'manual', activeCamera?.name ?? 'Câmera');
      toggleRecording();
    }
  }, [recorder, webStream, activeCamera, toggleRecording]);

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const todayAlerts = alerts.filter((a) => Date.now() - a.timestamp.getTime() < 86400000).length;

  const cameraOverlay = (
    <CameraOverlay
      time={currentTime}
      cameraName={activeCamera?.name ?? 'Câmera'}
      isRecording={recorder.state === 'recording'}
      duration={recorder.currentDuration}
      pulseAnim={pulseAnim}
    />
  );

  if (showGrid) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg1 }}>
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>Grade de Câmeras</Text>
          <TouchableOpacity style={styles.gridCloseBtn} onPress={() => setShowGrid(false)}>
            <Text style={styles.gridCloseText}>✕ Fechar</Text>
          </TouchableOpacity>
        </View>
        <MultiCameraGrid />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Camera Feed ── */}
      <View style={styles.cameraContainer}>
        {Platform.OS === 'web' ? (
          <WebCameraView
            style={StyleSheet.absoluteFill}
            onStatusChange={setWebCamStatus}
            isRecording={recorder.state === 'recording'}
            onStream={setWebStream}
          >
            {cameraOverlay}
          </WebCameraView>
        ) : permission?.granted ? (
          <CameraView style={styles.cameraView} facing="back">
            {cameraOverlay}
          </CameraView>
        ) : (
          <NativePermissionPrompt onRequest={requestPermission} denied={permission?.status === 'denied'} />
        )}

        {/* Night vision badge */}
        {nightVisionOn && (
          <View style={styles.nvBadge}>
            <Text style={styles.nvBadgeText}>🌙 NOTURNO</Text>
          </View>
        )}
      </View>

      {/* ── Quick Controls ── */}
      <View style={styles.controlRow}>
        <IconButton icon="👁" label="Movimento" active={settings.motionDetection && isMonitoring} onPress={toggleMonitoring} />
        <IconButton
          icon="🎙" label={isMicActive ? 'Mic ON' : 'Mic OFF'}
          active={isMicActive}
          onPress={() => { toggleMic(); }}
        />
        <IconButton
          icon="🌙" label="Noturno"
          active={nightVisionOn}
          onPress={() => setNightVisionOn((v) => !v)}
        />
        <IconButton
          icon="⏺" label={recorder.state === 'recording' ? `${recorder.currentDuration}s` : 'Gravar'}
          active={recorder.state === 'recording'}
          onPress={handleRecordToggle}
          danger={recorder.state === 'recording'}
        />
        <IconButton icon="👶" label="Babá" active={babyModeActive} onPress={toggleBabyMode} />
      </View>

      {/* ── Second row: grid + clips ── */}
      <View style={styles.controlRow}>
        <IconButton icon="⊞" label="Grade" active={showGrid} onPress={() => setShowGrid(true)} />
        <IconButton
          icon="🎬"
          label={`Clipes (${recorder.clips.length})`}
          active={recorder.clips.length > 0}
          onPress={() => {}}
        />
        <IconButton icon="⚙️" label="Config." active={false} onPress={() => {}} />
      </View>

      {/* ── Monitor toggle ── */}
      <GlowCard style={styles.statusCard} glowColor={isMonitoring ? COLORS.accent : undefined}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusTitle}>{isMonitoring ? '🟢 Monitorando' : '⚪ Parado'}</Text>
            <Text style={styles.statusSub}>
              {isMonitoring ? `Online há ${formatUptime(uptime)}` : 'Toque para iniciar'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.mainToggleBtn, isMonitoring && styles.mainToggleBtnActive]}
            onPress={toggleMonitoring}
          >
            <Text style={[styles.mainToggleText, isMonitoring && { color: COLORS.bg0 }]}>
              {isMonitoring ? 'Parar' : 'Iniciar'}
            </Text>
          </TouchableOpacity>
        </View>
      </GlowCard>

      {/* ── Detection meters ── */}
      <SectionHeader title="Detecção em tempo real" />
      <GlowCard>
        <MetricBar label="Movimento" value={detectionLevels.motion} color={COLORS.accent} />
        <MetricBar label="Som" value={detectionLevels.sound} color={COLORS.warning} />
        <MetricBar label="Choro" value={detectionLevels.cry} color={COLORS.baby} />
      </GlowCard>

      {/* ── Clips saved ── */}
      {recorder.clips.length > 0 && (
        <>
          <SectionHeader
            title={`Clipes gravados (${recorder.clips.length})`}
            action={{ label: 'Limpar tudo', onPress: recorder.clearAllClips }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clipsRow}>
            {recorder.clips.map((clip) => (
              <TouchableOpacity
                key={clip.id}
                style={styles.clipCard}
                onPress={() => recorder.downloadClip(clip)}
              >
                {clip.thumbnailUrl ? (
                  <View style={styles.clipThumb}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <img
                      src={clip.thumbnailUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 } as any}
                      alt="clip"
                    />
                  </View>
                ) : (
                  <View style={styles.clipThumb}>
                    <Text style={{ fontSize: 20 }}>🎬</Text>
                  </View>
                )}
                <Text style={styles.clipDuration}>{clip.durationSecs}s</Text>
                <Text style={styles.clipType}>{
                  clip.triggerType === 'motion' ? '👁' :
                  clip.triggerType === 'cry' ? '👶' :
                  clip.triggerType === 'sound' ? '🎙' : '⏺'
                }</Text>
                <Text style={styles.clipDownload}>⬇ Baixar</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Stats ── */}
      <SectionHeader title="Hoje" />
      <View style={styles.statsRow}>
        <StatCard value={todayAlerts} label="Alertas" accent={COLORS.alert} />
        <StatCard value={formatUptime(uptime)} label="Online" accent={COLORS.accent} />
        <StatCard value={cameras.filter((c) => c.isOnline).length} label="Câmeras" accent={COLORS.online} />
      </View>

      {/* ── Baby mode ── */}
      {babyModeActive && (
        <GlowCard style={styles.babyCard} glowColor={COLORS.baby}>
          <Text style={styles.babyTitle}>👶 Modo Babá Eletrônica Ativo</Text>
          <Text style={styles.babySub}>IA monitorando padrão de choro, movimentos e sons</Text>
          <View style={styles.babyMetrics}>
            <BabyMetric label="Choro" value={detectionLevels.cry} />
            <View style={styles.babyDivider} />
            <BabyMetric label="Movimento" value={detectionLevels.motion} />
            <View style={styles.babyDivider} />
            <BabyMetric label="Som" value={detectionLevels.sound} />
          </View>
        </GlowCard>
      )}

    </ScrollView>
  );
}

function CameraOverlay({ time, cameraName, isRecording, duration, pulseAnim }: any) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.overlayTop}>
        <LiveBadge />
        <Text style={styles.overlayTime}>{time}</Text>
      </View>
      <View style={styles.overlayBottom}>
        <Text style={styles.overlayCamName}>{cameraName}</Text>
        {isRecording && (
          <Animated.View style={[styles.recIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC {duration > 0 ? `${duration}s` : ''}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function NativePermissionPrompt({ onRequest, denied }: { onRequest: () => void; denied: boolean }) {
  return (
    <View style={styles.permContainer}>
      <Text style={styles.permIcon}>{denied ? '🔒' : '📷'}</Text>
      <Text style={styles.permText}>
        {denied ? 'Permissão negada. Configure o sistema para permitir a câmera.' : 'Permissão necessária.'}
      </Text>
      {!denied && (
        <TouchableOpacity style={styles.permBtn} onPress={onRequest}>
          <Text style={styles.permBtnText}>Permitir câmera</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BabyMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.babyMetric}>
      <Text style={[styles.babyMetricVal, { color: COLORS.baby }]}>{value}%</Text>
      <Text style={styles.babyMetricLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  cameraContainer: {
    width: '100%', height: 220, borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: COLORS.bg4, backgroundColor: COLORS.bg0,
    position: 'relative',
  },
  cameraView: { flex: 1 },
  nvBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,255,0,0.2)', borderWidth: 0.5, borderColor: '#00ff00',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  nvBadgeText: { color: '#00ff00', fontSize: 10, fontWeight: '700' },
  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.md,
  } as any,
  overlayTime: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  overlayBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.md,
  } as any,
  overlayCamName: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  recIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.alert + 'cc', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  recDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  recText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  permContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  permIcon: { fontSize: 36 },
  permText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accent },
  permBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  controlRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  statusCard: { marginTop: SPACING.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  statusSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  mainToggleBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accent },
  mainToggleBtnActive: { backgroundColor: COLORS.accent },
  mainToggleText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  clipsRow: { marginBottom: SPACING.sm },
  clipCard: {
    backgroundColor: COLORS.bg2, borderRadius: RADIUS.md, padding: 8,
    marginRight: 10, alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.bg4, width: 90,
  },
  clipThumb: {
    width: 74, height: 48, borderRadius: 6, backgroundColor: COLORS.bg3,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  clipDuration: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  clipType: { fontSize: 14, marginTop: 2 },
  clipDownload: { fontSize: 10, color: COLORS.accent, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  babyCard: { marginTop: SPACING.md, borderColor: COLORS.baby + '44' },
  babyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.baby, marginBottom: 4 },
  babySub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
  babyMetrics: { flexDirection: 'row', alignItems: 'center' },
  babyMetric: { flex: 1, alignItems: 'center' },
  babyMetricVal: { fontSize: 22, fontWeight: '700' },
  babyMetricLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  babyDivider: { width: 0.5, height: 36, backgroundColor: COLORS.bg4 },
  gridHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, backgroundColor: COLORS.bg2,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4,
  },
  gridTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  gridCloseBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, borderWidth: 0.5, borderColor: COLORS.bg4 },
  gridCloseText: { color: COLORS.textSecondary, fontSize: 13 },
});
