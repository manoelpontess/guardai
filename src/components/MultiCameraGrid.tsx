import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Dimensions,
} from 'react-native';
import { useAppStore, Camera } from '../store/appStore';
import { WebCameraView } from './WebCameraView';
import { LiveBadge, StatusBadge } from './UIComponents';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const { width: SW } = Dimensions.get('window');

type GridLayout = '1' | '2x2' | '1+2' | '2x3';

export function MultiCameraGrid() {
  const { cameras, activeCameraId, setActiveCameraId } = useAppStore();
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const onlineCams = cameras.filter((c) => c.isOnline);

  if (onlineCams.length === 0) {
    return (
      <View style={styles.emptyGrid}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyText}>Nenhuma câmera online</Text>
        <Text style={styles.emptySub}>Adicione câmeras na aba Câmeras</Text>
      </View>
    );
  }

  if (fullscreen) {
    const cam = cameras.find((c) => c.id === fullscreen);
    return (
      <View style={styles.fullscreenContainer}>
        <CameraCell
          camera={cam ?? onlineCams[0]}
          height={SW * 0.5625} // 16:9
          isActive={cam?.id === activeCameraId}
          onPress={() => setActiveCameraId(cam?.id ?? '')}
          onLongPress={() => setFullscreen(null)}
        />
        <TouchableOpacity style={styles.exitFullscreen} onPress={() => setFullscreen(null)}>
          <Text style={styles.exitText}>✕ Sair do modo fullscreen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.gridWrapper}>
      {/* Layout picker */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.layoutBar}
      >
        {([['1', '▣'], ['2x2', '⊞'], ['1+2', '⊟'], ['2x3', '⊠']] as [GridLayout, string][]).map(([l, icon]) => (
          <TouchableOpacity
            key={l}
            style={[styles.layoutBtn, layout === l && styles.layoutBtnActive]}
            onPress={() => setLayout(l)}
          >
            <Text style={[styles.layoutBtnText, layout === l && { color: COLORS.accent }]}>
              {icon} {l}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      <GridLayout
        layout={layout}
        cameras={onlineCams}
        activeCameraId={activeCameraId}
        onSelect={setActiveCameraId}
        onFullscreen={setFullscreen}
      />
    </View>
  );
}

function GridLayout({ layout, cameras, activeCameraId, onSelect, onFullscreen }: {
  layout: GridLayout;
  cameras: Camera[];
  activeCameraId: string | null;
  onSelect: (id: string) => void;
  onFullscreen: (id: string) => void;
}) {
  const cellH = layout === '1' ? 300 : layout === '2x3' ? 120 : 160;

  if (layout === '1') {
    const cam = cameras[0];
    return (
      <CameraCell
        camera={cam}
        height={300}
        isActive={cam.id === activeCameraId}
        onPress={() => onSelect(cam.id)}
        onLongPress={() => onFullscreen(cam.id)}
      />
    );
  }

  if (layout === '1+2') {
    return (
      <View>
        <CameraCell
          camera={cameras[0]}
          height={180}
          isActive={cameras[0].id === activeCameraId}
          onPress={() => onSelect(cameras[0].id)}
          onLongPress={() => onFullscreen(cameras[0].id)}
        />
        <View style={styles.row}>
          {cameras.slice(1, 3).map((cam) => (
            <View key={cam.id} style={{ flex: 1 }}>
              <CameraCell
                camera={cam}
                height={cellH}
                isActive={cam.id === activeCameraId}
                onPress={() => onSelect(cam.id)}
                onLongPress={() => onFullscreen(cam.id)}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // 2x2 and 2x3
  const cols = 2;
  const rows = [];
  for (let i = 0; i < cameras.length; i += cols) {
    rows.push(cameras.slice(i, i + cols));
  }

  return (
    <View>
      {rows.map((rowCams, ri) => (
        <View key={ri} style={styles.row}>
          {rowCams.map((cam) => (
            <View key={cam.id} style={{ flex: 1 }}>
              <CameraCell
                camera={cam}
                height={cellH}
                isActive={cam.id === activeCameraId}
                onPress={() => onSelect(cam.id)}
                onLongPress={() => onFullscreen(cam.id)}
              />
            </View>
          ))}
          {/* Fill empty slot */}
          {rowCams.length < cols && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

function CameraCell({ camera, height, isActive, onPress, onLongPress }: {
  camera: Camera;
  height: number;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cell, { height }, isActive && styles.cellActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.9}
    >
      {Platform.OS === 'web' ? (
        <WebCameraView style={StyleSheet.absoluteFill}>
          <CellOverlay camera={camera} />
        </WebCameraView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.offlinePlaceholder]}>
          <Text style={styles.offlineIcon}>📷</Text>
          <CellOverlay camera={camera} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function CellOverlay({ camera }: { camera: Camera }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.cellTop}>
        <LiveBadge />
      </View>
      <View style={styles.cellBottom}>
        <Text style={styles.cellName}>{camera.name}</Text>
        <Text style={styles.cellMode}>
          {camera.mode === 'baby' ? '👶' : '🔒'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridWrapper: { flex: 1 },
  layoutBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  layoutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.bg4,
    backgroundColor: COLORS.bg2,
  },
  layoutBtnActive: {
    borderColor: COLORS.accent, backgroundColor: COLORS.accentDim,
  },
  layoutBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  row: { flexDirection: 'row' },
  cell: {
    margin: 1, backgroundColor: COLORS.bg0,
    overflow: 'hidden', position: 'relative',
    borderWidth: 0.5, borderColor: COLORS.bg4,
  },
  cellActive: { borderColor: COLORS.accent, borderWidth: 1.5 },
  cellTop: {
    position: 'absolute', top: 6, left: 6,
  } as any,
  cellBottom: {
    position: 'absolute', bottom: 6, left: 8, right: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  } as any,
  cellName: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600' },
  cellMode: { fontSize: 10 },
  offlinePlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg0,
  },
  offlineIcon: { fontSize: 24, opacity: 0.25 },
  emptyGrid: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textMuted },
  fullscreenContainer: { flex: 1, backgroundColor: COLORS.bg0 },
  exitFullscreen: {
    padding: SPACING.md, alignItems: 'center',
    backgroundColor: COLORS.bg2, borderTopWidth: 0.5, borderTopColor: COLORS.bg4,
  },
  exitText: { color: COLORS.textSecondary, fontSize: 13 },
});
