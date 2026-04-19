import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

// ─── GlowCard ────────────────────────────────────────────────────────────────
interface GlowCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  onPress?: () => void;
}
export function GlowCard({ children, style, glowColor, onPress }: GlowCardProps) {
  const content = (
    <View style={[styles.glowCard, glowColor ? { borderColor: glowColor + '44' } : {}, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{content}</TouchableOpacity>;
  }
  return content;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  online: boolean;
  label?: string;
}
export function StatusBadge({ online, label }: StatusBadgeProps) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: online ? COLORS.online + '22' : COLORS.offline + '22' }]}>
      <View style={[styles.statusDot, { backgroundColor: online ? COLORS.online : COLORS.offline }]} />
      <Text style={[styles.statusText, { color: online ? COLORS.online : COLORS.offline }]}>
        {label ?? (online ? 'Online' : 'Offline')}
      </Text>
    </View>
  );
}

// ─── LiveBadge ───────────────────────────────────────────────────────────────
export function LiveBadge() {
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>AO VIVO</Text>
    </View>
  );
}

// ─── MetricBar ───────────────────────────────────────────────────────────────
interface MetricBarProps {
  label: string;
  value: number;
  color: string;
  unit?: string;
}
export function MetricBar({ label, value, color, unit }: MetricBarProps) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}{unit ?? '%'}</Text>
    </View>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  value: string | number;
  label: string;
  accent?: string;
}
export function StatCard({ value, label, accent }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
interface IconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
  danger?: boolean;
}
export function IconButton({ icon, label, active, onPress, danger }: IconButtonProps) {
  const activeColor = danger ? COLORS.alert : COLORS.accent;
  return (
    <TouchableOpacity
      style={[
        styles.iconBtn,
        active && { borderColor: activeColor, backgroundColor: activeColor + '18' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.iconBtnIcon}>{icon}</Text>
      <Text style={[styles.iconBtnLabel, active && { color: activeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────
interface ToggleRowProps {
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
}
export function ToggleRow({ label, sublabel, value, onToggle, accentColor }: ToggleRowProps) {
  const color = accentColor ?? COLORS.accent;
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sublabel && <Text style={styles.toggleSub}>{sublabel}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && { backgroundColor: color }]}
        onPress={() => onToggle(!value)}
        activeOpacity={0.8}
      >
        <View style={[styles.toggleThumb, value && { left: 20 }]} />
      </TouchableOpacity>
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  glowCard: {
    backgroundColor: COLORS.bg2,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.bg4,
    padding: SPACING.lg,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.alert,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  metricRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  metricLabel: { color: COLORS.textSecondary, fontSize: 12, width: 68 },
  metricTrack: {
    flex: 1, height: 3, backgroundColor: COLORS.bg4,
    borderRadius: 2, overflow: 'hidden',
  },
  metricFill: { height: '100%', borderRadius: 2 },
  metricValue: { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },
  statCard: {
    flex: 1, backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  iconBtn: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 0.5,
    borderColor: COLORS.bg4, backgroundColor: COLORS.bg2,
    gap: 4,
  },
  iconBtnIcon: { fontSize: 18 },
  iconBtnLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  sectionAction: { fontSize: 12, color: COLORS.accent },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4,
  },
  toggleInfo: { flex: 1, marginRight: SPACING.md },
  toggleLabel: { fontSize: 14, color: COLORS.textPrimary },
  toggleSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  toggle: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: COLORS.bg4, justifyContent: 'center',
    position: 'relative',
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', position: 'absolute', left: 2,
  },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
