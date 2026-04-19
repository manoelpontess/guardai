import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SectionList,
} from 'react-native';
import { useAppStore, Alert, AlertType } from '../store/appStore';
import { SectionHeader, EmptyState } from '../components/UIComponents';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import { buildActivityData, getPeakHour, getTotalByType } from '../utils/activityData';

const ALERT_CONFIG: Record<AlertType, { icon: string; color: string; label: string }> = {
  motion: { icon: '👁', color: COLORS.accent, label: 'Movimento' },
  sound: { icon: '🎙', color: COLORS.warning, label: 'Som alto' },
  cry: { icon: '👶', color: COLORS.baby, label: 'Choro' },
  connection: { icon: '📡', color: COLORS.alert, label: 'Conexão' },
};

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Há ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
}

function groupAlertsByDay(alerts: Alert[]): { title: string; data: Alert[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groups: Record<string, Alert[]> = {};
  alerts.forEach((a) => {
    const day = a.timestamp.toDateString();
    const label = day === today ? 'Hoje' : day === yesterday ? 'Ontem' : a.timestamp.toLocaleDateString('pt-BR');
    if (!groups[label]) groups[label] = [];
    groups[label].push(a);
  });

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function AlertsScreen() {
  const { alerts, markAlertRead, markAllRead, getUnreadCount } = useAppStore();
  const unreadCount = getUnreadCount();

  const sections = useMemo(() => groupAlertsByDay(alerts), [alerts]);
  const activityData = useMemo(() => buildActivityData(alerts), [alerts]);
  const totals = useMemo(() => getTotalByType(activityData), [activityData]);
  const peak = useMemo(() => getPeakHour(activityData), [activityData]);

  return (
    <View style={styles.container}>
      {/* Header actions */}
      <View style={styles.topBar}>
        <View style={styles.summaryRow}>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount} novo{unreadCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar todos como lidos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <FilterChips alerts={alerts} />

      {/* Activity chart */}
      {alerts.length > 0 && (
        <ActivityChart data={activityData} totals={totals} peak={peak} />
      )}

      {alerts.length === 0 ? (
        <EmptyState icon="🔔" text="Nenhum alerta ainda.\nO app irá notificá-lo aqui quando detectar movimento, som ou choro." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionLabel}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <AlertItem
              alert={item}
              onPress={() => markAlertRead(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────
function FilterChips({ alerts }: { alerts: Alert[] }) {
  const [active, setActive] = React.useState<AlertType | null>(null);
  const counts = useMemo(() => {
    const c: Partial<Record<AlertType, number>> = {};
    alerts.forEach((a) => { c[a.type] = (c[a.type] ?? 0) + 1; });
    return c;
  }, [alerts]);

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
    >
      <TouchableOpacity
        style={[styles.chip, !active && styles.chipActive]}
        onPress={() => setActive(null)}
      >
        <Text style={[styles.chipText, !active && styles.chipTextActive]}>
          Todos ({alerts.length})
        </Text>
      </TouchableOpacity>
      {(Object.keys(ALERT_CONFIG) as AlertType[]).map((type) => {
        const conf = ALERT_CONFIG[type];
        const count = counts[type] ?? 0;
        if (count === 0) return null;
        const isActive = active === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.chip, isActive && { borderColor: conf.color, backgroundColor: conf.color + '18' }]}
            onPress={() => setActive(isActive ? null : type)}
          >
            <Text style={styles.chipIcon}>{conf.icon}</Text>
            <Text style={[styles.chipText, isActive && { color: conf.color }]}>
              {conf.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Alert Item ───────────────────────────────────────────────────────────────
function AlertItem({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const conf = ALERT_CONFIG[alert.type];
  return (
    <TouchableOpacity
      style={[styles.alertItem, !alert.isRead && styles.alertItemUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.alertIcon, { backgroundColor: conf.color + '20' }]}>
        <Text style={styles.alertIconText}>{conf.icon}</Text>
      </View>
      <View style={styles.alertBody}>
        <Text style={styles.alertTitle}>{alert.message}</Text>
        <Text style={styles.alertCamera}>{alert.cameraName}</Text>
        <View style={styles.alertMeta}>
          <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
          {alert.durationSecs && (
            <Text style={styles.alertExtra}> · {alert.durationSecs}s</Text>
          )}
          {alert.decibels && (
            <Text style={styles.alertExtra}> · {alert.decibels} dB</Text>
          )}
        </View>
      </View>
      <View style={styles.alertRight}>
        {!alert.isRead && <View style={styles.unreadDot} />}
        {alert.clipPath && (
          <Text style={styles.clipIcon}>🎬</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm,
  },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm },
  unreadBadge: {
    backgroundColor: COLORS.alertDim, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: RADIUS.full,
  },
  unreadText: { color: COLORS.alert, fontSize: 12, fontWeight: '600' },
  markAllText: { fontSize: 12, color: COLORS.accent },
  chipsContainer: {
    paddingHorizontal: SPACING.lg, gap: 8,
    paddingBottom: SPACING.md,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.bg4,
    backgroundColor: COLORS.bg2,
  },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accent },
  chipIcon: { fontSize: 12 },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  alertItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.bg2, borderRadius: RADIUS.lg,
    borderWidth: 0.5, borderColor: COLORS.bg4,
    padding: 14, marginBottom: SPACING.sm,
  },
  alertItemUnread: { borderLeftWidth: 2, borderLeftColor: COLORS.accent },
  alertIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  alertIconText: { fontSize: 16 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  alertCamera: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  alertMeta: { flexDirection: 'row', marginTop: 4 },
  alertTime: { fontSize: 11, color: COLORS.textMuted },
  alertExtra: { fontSize: 11, color: COLORS.textMuted },
  alertRight: { alignItems: 'center', gap: SPACING.xs },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  clipIcon: { fontSize: 14, opacity: 0.7 },
});

// ─── Activity Chart ───────────────────────────────────────────────────────────
function ActivityChart({ data, totals, peak }: { data: any[]; totals: any; peak: any }) {
  const maxVal = Math.max(1, ...data.map((b: any) => b.total));
  // Show every 4th label to avoid crowding
  const visibleLabels = new Set(data.filter((_: any, i: number) => i % 4 === 0).map((b: any) => b.label));

  return (
    <View style={chartStyles.container}>
      {/* Totals row */}
      <View style={chartStyles.totalsRow}>
        <TotalBadge icon="👁" label="Movimento" value={totals.motion} color={COLORS.accent} />
        <TotalBadge icon="🎙" label="Som" value={totals.sound} color={COLORS.warning} />
        <TotalBadge icon="👶" label="Choro" value={totals.cry} color={COLORS.baby} />
        {peak && peak.total > 0 && (
          <TotalBadge icon="⚡" label={`Pico ${peak.label}`} value={peak.total} color={COLORS.alert} />
        )}
      </View>

      {/* Bar chart */}
      <View style={chartStyles.chartArea}>
        <View style={chartStyles.barsRow}>
          {data.map((bucket: any, i: number) => {
            const h = Math.max(2, Math.round((bucket.total / maxVal) * 80));
            const hasMotion = bucket.motion > 0;
            const hasCry = bucket.cry > 0;
            const hasSound = bucket.sound > 0;
            const barColor = hasCry ? COLORS.baby : hasMotion ? COLORS.accent : hasSound ? COLORS.warning : COLORS.bg4;
            return (
              <View key={i} style={chartStyles.barWrap}>
                <View style={[chartStyles.bar, { height: h, backgroundColor: barColor }]} />
              </View>
            );
          })}
        </View>
        {/* X-axis labels */}
        <View style={chartStyles.labelsRow}>
          {data.map((bucket: any, i: number) => (
            <View key={i} style={chartStyles.labelWrap}>
              {visibleLabels.has(bucket.label) && (
                <Text style={chartStyles.labelText}>{bucket.label}</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={chartStyles.legend}>
        <LegendItem color={COLORS.accent} label="Movimento" />
        <LegendItem color={COLORS.warning} label="Som" />
        <LegendItem color={COLORS.baby} label="Choro" />
      </View>
    </View>
  );
}

function TotalBadge({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[chartStyles.totalBadge, { borderColor: color + '44' }]}>
      <Text style={chartStyles.totalIcon}>{icon}</Text>
      <Text style={[chartStyles.totalValue, { color }]}>{value}</Text>
      <Text style={chartStyles.totalLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={chartStyles.legendItem}>
      <View style={[chartStyles.legendDot, { backgroundColor: color }]} />
      <Text style={chartStyles.legendText}>{label}</Text>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.bg2, borderRadius: RADIUS.lg,
    borderWidth: 0.5, borderColor: COLORS.bg4,
    padding: SPACING.md,
  },
  totalsRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md, flexWrap: 'wrap' },
  totalBadge: {
    flex: 1, minWidth: 60, alignItems: 'center', paddingVertical: 6,
    backgroundColor: COLORS.bg3, borderRadius: RADIUS.md, borderWidth: 0.5,
  },
  totalIcon: { fontSize: 14 },
  totalValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  totalLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  chartArea: { height: 100 },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 80, gap: 1,
  },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 80 },
  bar: { width: '80%', borderRadius: 2, minHeight: 2 },
  labelsRow: { flexDirection: 'row', marginTop: 4 },
  labelWrap: { flex: 1, alignItems: 'center' },
  labelText: { fontSize: 8, color: COLORS.textMuted },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
});
