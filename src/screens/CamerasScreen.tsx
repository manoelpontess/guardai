import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useAppStore, Camera, CameraMode } from '../store/appStore';
import {
  GlowCard, StatusBadge, SectionHeader,
  ToggleRow, EmptyState,
} from '../components/UIComponents';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function CamerasScreen() {
  const { cameras, activeCameraId, setActiveCameraId, updateCamera, addCamera, removeCamera } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const onlineCams = cameras.filter((c) => c.isOnline);
  const offlineCams = cameras.filter((c) => !c.isOnline);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <SectionHeader title={`${onlineCams.length} câmera${onlineCams.length !== 1 ? 's' : ''} online`} />

      {onlineCams.map((cam) => (
        <CameraCard
          key={cam.id}
          camera={cam}
          isActive={cam.id === activeCameraId}
          onSelect={() => setActiveCameraId(cam.id)}
          onUpdate={(update) => updateCamera(cam.id, update)}
          onRemove={() => {
            Alert.alert('Remover câmera', `Remover "${cam.name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Remover', style: 'destructive', onPress: () => removeCamera(cam.id) },
            ]);
          }}
        />
      ))}

      {offlineCams.length > 0 && (
        <>
          <SectionHeader title="Offline" />
          {offlineCams.map((cam) => (
            <CameraCard
              key={cam.id}
              camera={cam}
              isActive={false}
              onSelect={() => {}}
              onUpdate={(update) => updateCamera(cam.id, update)}
              onRemove={() => removeCamera(cam.id)}
            />
          ))}
        </>
      )}

      {cameras.length === 0 && (
        <EmptyState icon="📷" text="Nenhuma câmera adicionada.\nAdicione uma câmera para começar." />
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addBtnText}>+ Adicionar câmera</Text>
      </TouchableOpacity>

      <SectionHeader title="Como adicionar uma câmera" />
      <GlowCard>
        <StepItem n={1} text="Instale o GuardAI no segundo dispositivo (Android, iPhone ou computador)" />
        <StepItem n={2} text='Abra o app e selecione "Usar como câmera"' />
        <StepItem n={3} text="Escaneie o QR code ou insira o código de 6 dígitos" />
        <StepItem n={4} text="A câmera aparecerá automaticamente nesta lista" />
      </GlowCard>

      <AddCameraModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(cam) => { addCamera(cam); setShowAddModal(false); }}
      />
    </ScrollView>
  );
}

// ─── Camera Card ──────────────────────────────────────────────────────────────
function CameraCard({ camera, isActive, onSelect, onUpdate, onRemove }: {
  camera: Camera;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<Camera>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlowCard
      style={[styles.cameraCard, isActive && styles.cameraCardActive]}
      glowColor={isActive ? COLORS.accent : undefined}
    >
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => { onSelect(); setExpanded(!expanded); }}
        activeOpacity={0.8}
      >
        <View style={[styles.camThumb, { backgroundColor: camera.isOnline ? COLORS.bg4 : COLORS.bg3 }]}>
          <Text style={styles.camThumbIcon}>{camera.isOnline ? '📷' : '📵'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName}>{camera.name}</Text>
            {isActive && <Text style={styles.activePill}>Ativa</Text>}
          </View>
          <Text style={styles.cardDevice}>{camera.deviceName} · {camera.quality}</Text>
          <Text style={styles.cardMode}>
            {camera.mode === 'baby' ? '👶 Babá eletrônica' : '🔒 Segurança'}
          </Text>
        </View>
        <StatusBadge online={camera.isOnline} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardExpanded}>
          <View style={styles.expandDivider} />

          <ToggleRow
            label="Modo babá eletrônica"
            sublabel="Detecção de choro e sons do bebê"
            value={camera.mode === 'baby'}
            onToggle={(v) => onUpdate({ mode: v ? 'baby' : 'security' })}
            accentColor={COLORS.baby}
          />
          <ToggleRow
            label="Gravação ativa"
            value={camera.isRecording}
            onToggle={(v) => onUpdate({ isRecording: v })}
          />

          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Qualidade</Text>
            <View style={styles.qualityOptions}>
              {(['720p', '1080p', '4K'] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.qualityBtn, camera.quality === q && styles.qualityBtnActive]}
                  onPress={() => onUpdate({ quality: q })}
                >
                  <Text style={[styles.qualityBtnText, camera.quality === q && { color: COLORS.accent }]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Text style={styles.removeBtnText}>Remover câmera</Text>
          </TouchableOpacity>
        </View>
      )}
    </GlowCard>
  );
}

// ─── Step item ────────────────────────────────────────────────────────────────
function StepItem({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

// ─── Add Camera Modal ─────────────────────────────────────────────────────────
function AddCameraModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (cam: Omit<Camera, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<CameraMode>('security');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      deviceName: 'Novo dispositivo',
      isOnline: false,
      isRecording: false,
      quality: '1080p',
      mode,
      lastSeen: new Date(),
    });
    setName('');
    setMode('security');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Adicionar câmera</Text>
          <Text style={styles.modalSub}>Dê um nome para identificar este ponto</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Ex: Quarto, Cozinha, Garagem..."
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.modalLabel}>Modo</Text>
          <View style={styles.modeRow}>
            {(['security', 'baby'] as CameraMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={styles.modeBtnIcon}>{m === 'baby' ? '👶' : '🔒'}</Text>
                <Text style={[styles.modeBtnText, mode === m && { color: COLORS.accent }]}>
                  {m === 'baby' ? 'Babá eletrônica' : 'Segurança'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, !name.trim() && styles.modalConfirmBtnDisabled]}
              onPress={handleAdd}
              disabled={!name.trim()}
            >
              <Text style={styles.modalConfirmText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  cameraCard: { marginBottom: SPACING.sm },
  cameraCardActive: { borderColor: COLORS.accent + '55' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  camThumb: {
    width: 50, height: 38, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  camThumbIcon: { fontSize: 18 },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  activePill: {
    fontSize: 10, color: COLORS.accent, backgroundColor: COLORS.accentDim,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full,
  },
  cardDevice: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardMode: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  cardExpanded: {},
  expandDivider: { height: 0.5, backgroundColor: COLORS.bg4, marginVertical: SPACING.md },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  qualityLabel: { fontSize: 14, color: COLORS.textPrimary },
  qualityOptions: { flexDirection: 'row', gap: 6 },
  qualityBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  qualityBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  qualityBtnText: { fontSize: 12, color: COLORS.textSecondary },
  removeBtn: { marginTop: SPACING.sm, alignItems: 'center', padding: SPACING.sm },
  removeBtnText: { color: COLORS.alert, fontSize: 13 },
  addBtn: {
    borderWidth: 0.5, borderColor: COLORS.bg4, borderStyle: 'dashed',
    borderRadius: RADIUS.lg, padding: 14, alignItems: 'center',
    marginVertical: SPACING.sm, backgroundColor: COLORS.bg2,
  },
  addBtnText: { color: COLORS.textSecondary, fontSize: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 12, color: COLORS.accent, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'center', alignItems: 'center', padding: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.bg2, borderRadius: RADIUS.xl,
    padding: SPACING.xl, width: '100%',
    borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },
  modalInput: {
    backgroundColor: COLORS.bg3, borderRadius: RADIUS.md,
    padding: 12, fontSize: 15, color: COLORS.textPrimary,
    borderWidth: 0.5, borderColor: COLORS.bg4, marginBottom: SPACING.lg,
  },
  modalLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg3, borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  modeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  modeBtnIcon: { fontSize: 16 },
  modeBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  modalCancelBtn: {
    flex: 1, padding: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg3, alignItems: 'center',
    borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '500' },
  modalConfirmBtn: {
    flex: 1, padding: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent, alignItems: 'center',
  },
  modalConfirmBtnDisabled: { opacity: 0.4 },
  modalConfirmText: { color: COLORS.bg0, fontWeight: '700' },
});
