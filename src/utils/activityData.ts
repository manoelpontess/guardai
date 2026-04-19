import { Alert, AlertType } from '../store/appStore';

export interface HourBucket {
  hour: number;       // 0–23
  label: string;      // "00h", "06h" etc.
  motion: number;
  sound: number;
  cry: number;
  total: number;
}

export function buildActivityData(alerts: Alert[], hoursBack = 24): HourBucket[] {
  const now = new Date();
  const buckets: HourBucket[] = [];

  for (let i = hoursBack - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const h = d.getHours();
    buckets.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}h`,
      motion: 0, sound: 0, cry: 0, total: 0,
    });
  }

  alerts.forEach((alert) => {
    const diffMs = now.getTime() - alert.timestamp.getTime();
    if (diffMs > hoursBack * 3600000) return;
    const bucketIdx = hoursBack - 1 - Math.floor(diffMs / 3600000);
    if (bucketIdx < 0 || bucketIdx >= buckets.length) return;
    const b = buckets[bucketIdx];
    if (alert.type === 'motion') b.motion++;
    else if (alert.type === 'sound') b.sound++;
    else if (alert.type === 'cry') b.cry++;
    b.total++;
  });

  return buckets;
}

export function getPeakHour(data: HourBucket[]): HourBucket | null {
  if (data.length === 0) return null;
  return data.reduce((max, b) => b.total > max.total ? b : max, data[0]);
}

export function getTotalByType(data: HourBucket[]): Record<AlertType, number> {
  return {
    motion: data.reduce((s, b) => s + b.motion, 0),
    sound: data.reduce((s, b) => s + b.sound, 0),
    cry: data.reduce((s, b) => s + b.cry, 0),
    connection: 0,
  };
}
