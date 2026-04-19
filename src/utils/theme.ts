import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const COLORS = {
  // Background layers
  bg0: '#060b18',       // deepest
  bg1: '#0a0f1e',       // main bg
  bg2: '#111827',       // cards
  bg3: '#1a2235',       // elevated cards
  bg4: '#222d42',       // borders/subtle

  // Accent — electric cyan
  accent: '#00d4ff',
  accentDim: '#00d4ff22',
  accentGlow: '#00d4ff44',

  // Status
  online: '#00e676',
  offline: '#546e7a',
  alert: '#ff5252',
  alertDim: '#ff525222',
  warning: '#ffab40',
  warningDim: '#ffab4022',

  // Baby mode — soft pink
  baby: '#f48fb1',
  babyDim: '#f48fb122',

  // Text
  textPrimary: '#e8f0fe',
  textSecondary: '#8899bb',
  textMuted: '#445577',

  // Overlay
  overlay: 'rgba(6,11,24,0.85)',
  overlayLight: 'rgba(6,11,24,0.5)',
};

export const FONTS = {
  display: Platform.select({
    ios: 'System',
    android: 'sans-serif-condensed',
    default: 'system-ui',
  }),
  mono: Platform.select({
    ios: 'Courier New',
    android: 'monospace',
    default: 'monospace',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  }),
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  accent: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
};
