import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import {
  GlowCard, SectionHeader, ToggleRow,
} from '../components/UIComponents';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppStore();

  const set = (key: string, value: any) => updateSettings({ [key]: value } as any);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Detection */}
      <SectionHeader title="Detecção" />
      <GlowCard style={styles.group}>
        <ToggleRow
          label="Detecção de movimento"
          sublabel="Alerta quando há movimentação"
          value={settings.motionDetection}
          onToggle={(v) => set('motionDetection', v)}
        />
        <ToggleRow
          label="Detecção de choro"
          sublabel="IA identifica choro de bebê"
          value={settings.cryDetection}
          onToggle={(v) => set('cryDetection', v)}
          accentColor={COLORS.baby}
        />
        <ToggleRow
          label="Alerta de som alto"
          sublabel={`Notificar acima de ${settings.soundThresholdDb} dB`}
          value={settings.soundDetection}
          onToggle={(v) => set('soundDetection', v)}
        />
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Sensibilidade de movimento</Text>
          <View style={styles.sliderControl}>
            <Text style={styles.sliderMin}>1</Text>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${(settings.motionSensitivity / 10) * 100}%` }]} />
              {[...Array(10)].map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.sliderTick,
                    { left: `${i * 11.1}%` as any },
                    settings.motionSensitivity === i + 1 && styles.sliderTickActive,
                  ]}
                  onPress={() => set('motionSensitivity', i + 1)}
                />
              ))}
            </View>
            <Text style={styles.sliderMax}>10</Text>
          </View>
          <Text style={styles.sliderValue}>{settings.motionSensitivity}</Text>
        </View>
      </GlowCard>

      {/* Camera */}
      <SectionHeader title="Câmera" />
      <GlowCard style={styles.group}>
        <ToggleRow
          label="Visão noturna automática"
          sublabel="Ajusta brilho em ambientes escuros"
          value={settings.nightVision}
          onToggle={(v) => set('nightVision', v)}
        />
        <ToggleRow
          label="Áudio bidirecional"
          sublabel="Fale através do app remotamente"
          value={settings.twoWayAudio}
          onToggle={(v) => set('twoWayAudio', v)}
        />
        <View style={styles.qualityRow}>
          <Text style={styles.qualityLabel}>Qualidade de vídeo</Text>
          <View style={styles.qualityOptions}>
            {(['720p', '1080p', '4K'] as const).map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.qualityBtn, settings.videoQuality === q && styles.qualityBtnActive]}
                onPress={() => set('videoQuality', q)}
              >
                <Text style={[styles.qualityBtnText, settings.videoQuality === q && { color: COLORS.accent }]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GlowCard>

      {/* Recording */}
      <SectionHeader title="Gravação" />
      <GlowCard style={styles.group}>
        <ToggleRow
          label="Gravar ao detectar evento"
          sublabel="Salva clipe de 30s antes e depois"
          value={settings.autoRecord}
          onToggle={(v) => set('autoRecord', v)}
        />
        <ToggleRow
          label="Backup na nuvem"
          sublabel="Envia clipes automaticamente"
          value={settings.cloudBackup}
          onToggle={(v) => set('cloudBackup', v)}
        />
      </GlowCard>

      {/* Notifications */}
      <SectionHeader title="Notificações" />
      <GlowCard style={styles.group}>
        <ToggleRow
          label="Notificação push"
          sublabel="Alertas no celular em tempo real"
          value={settings.pushNotifications}
          onToggle={(v) => set('pushNotifications', v)}
        />
        <ToggleRow
          label="Notificação por e-mail"
          sublabel="Relatório diário de eventos"
          value={settings.emailNotifications}
          onToggle={(v) => set('emailNotifications', v)}
        />
        <ToggleRow
          label="Modo silencioso noturno"
          sublabel={`Sem alertas de ${settings.quietStart} às ${settings.quietEnd}`}
          value={settings.quietHours}
          onToggle={(v) => set('quietHours', v)}
        />
        <ToggleRow
          label="Lanterna no alerta"
          sublabel="Pisca a lanterna ao detectar evento"
          value={settings.flashlightOnAlert}
          onToggle={(v) => set('flashlightOnAlert', v)}
        />
      </GlowCard>

      {/* About */}
      <SectionHeader title="Sobre" />
      <GlowCard>
        <InfoRow label="Versão" value="1.0.0" />
        <InfoRow label="Plataforma" value="Android · iOS · Web" />
        <InfoRow label="Tecnologia" value="React Native + Expo" />
        <InfoRow label="Detecção de IA" value="TensorFlow Lite" />
        <InfoRow label="Streaming" value="WebRTC" />
      </GlowCard>

    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  group: { padding: 0, overflow: 'hidden' },
  sliderRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4,
  },
  sliderLabel: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 },
  sliderControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderMin: { fontSize: 11, color: COLORS.textMuted, width: 12 },
  sliderMax: { fontSize: 11, color: COLORS.textMuted, width: 16 },
  sliderTrack: {
    flex: 1, height: 4, backgroundColor: COLORS.bg4,
    borderRadius: 2, position: 'relative',
    flexDirection: 'row',
  },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLORS.accent, borderRadius: 2 },
  sliderTick: {
    position: 'absolute', top: -5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.bg4, borderWidth: 1, borderColor: COLORS.bg4,
  },
  sliderTickActive: {
    backgroundColor: COLORS.accent, borderColor: COLORS.accent,
    transform: [{ scale: 1.2 }],
  },
  sliderValue: {
    fontSize: 13, fontWeight: '600', color: COLORS.accent,
    textAlign: 'right', marginTop: 6,
  },
  qualityRow: {
    paddingVertical: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  qualityLabel: { fontSize: 14, color: COLORS.textPrimary },
  qualityOptions: { flexDirection: 'row', gap: 6 },
  qualityBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.bg4,
    backgroundColor: COLORS.bg3,
  },
  qualityBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  qualityBtnText: { fontSize: 12, color: COLORS.textSecondary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4,
  },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
});
