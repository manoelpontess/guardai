import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const PIN_KEY = 'guardai:pin';
const PIN_ENABLED_KEY = 'guardai:pin_enabled';
const PIN_LENGTH = 4;

interface PinLockScreenProps {
  onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [entered, setEntered] = useState('');
  const [mode, setMode] = useState<'unlock' | 'setup' | 'confirm'>('unlock');
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([...Array(PIN_LENGTH)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    loadPin();
  }, []);

  const loadPin = async () => {
    const pin = await AsyncStorage.getItem(PIN_KEY);
    const enabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);
    if (!pin || enabled !== '1') {
      setMode('setup');
    } else {
      setStoredPin(pin);
      setMode('unlock');
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const animateDot = (idx: number) => {
    Animated.sequence([
      Animated.timing(dotAnims[idx], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (d: string) => {
    if (entered.length >= PIN_LENGTH) return;
    const next = entered + d;
    animateDot(next.length - 1);
    setEntered(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleComplete(next), 200);
    }
  };

  const handleDelete = () => {
    if (entered.length === 0) return;
    Animated.timing(dotAnims[entered.length - 1], { toValue: 0, duration: 80, useNativeDriver: true }).start();
    setEntered((prev) => prev.slice(0, -1));
  };

  const handleComplete = async (pin: string) => {
    if (mode === 'unlock') {
      if (pin === storedPin) {
        onUnlock();
      } else {
        shake();
        setError('PIN incorreto. Tente novamente.');
        setEntered('');
        dotAnims.forEach((a) => Animated.timing(a, { toValue: 0, duration: 80, useNativeDriver: true }).start());
      }
    } else if (mode === 'setup') {
      setTempPin(pin);
      setMode('confirm');
      setEntered('');
      dotAnims.forEach((a) => Animated.timing(a, { toValue: 0, duration: 80, useNativeDriver: true }).start());
    } else if (mode === 'confirm') {
      if (pin === tempPin) {
        await AsyncStorage.setItem(PIN_KEY, pin);
        await AsyncStorage.setItem(PIN_ENABLED_KEY, '1');
        onUnlock();
      } else {
        shake();
        setError('PINs não coincidem. Tente novamente.');
        setTempPin('');
        setMode('setup');
        setEntered('');
        dotAnims.forEach((a) => Animated.timing(a, { toValue: 0, duration: 80, useNativeDriver: true }).start());
      }
    }
  };

  const modeLabels = {
    unlock: 'Digite seu PIN',
    setup: 'Crie um PIN de 4 dígitos',
    confirm: 'Confirme o PIN',
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Text style={styles.logoIcon}>🛡</Text>
        <Text style={styles.logoText}>GuardAI</Text>
        <Text style={styles.logoSub}>Câmera de Segurança</Text>
      </View>

      {/* PIN dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[...Array(PIN_LENGTH)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: dotAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.bg4, COLORS.accent],
                }),
                transform: [{
                  scale: dotAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                }],
              },
            ]}
          />
        ))}
      </Animated.View>

      <Text style={styles.modeLabel}>{modeLabels[mode]}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Numpad */}
      <View style={styles.pad}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => {
              if (key === '⌫') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            activeOpacity={key === '' ? 1 : 0.6}
            disabled={key === ''}
          >
            <Text style={[styles.keyText, key === '⌫' && { color: COLORS.textSecondary, fontSize: 20 }]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── PIN Settings (inside SettingsScreen) ─────────────────────────────────────
export function PinSettings() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PIN_ENABLED_KEY).then((v) => setPinEnabled(v === '1'));
  }, []);

  const disablePin = async () => {
    await AsyncStorage.removeItem(PIN_KEY);
    await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
    setPinEnabled(false);
  };

  return (
    <View>
      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Bloqueio por PIN</Text>
          <Text style={styles.settingSub}>
            {pinEnabled ? 'Ativo — exige PIN ao abrir' : 'Desativado'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggle, pinEnabled && { backgroundColor: COLORS.accent }]}
          onPress={() => pinEnabled ? disablePin() : setShowSetup(true)}
        >
          <View style={[styles.toggleThumb, pinEnabled && { left: 20 }]} />
        </TouchableOpacity>
      </View>

      {pinEnabled && (
        <TouchableOpacity style={styles.changePin} onPress={() => setShowSetup(true)}>
          <Text style={styles.changePinText}>Alterar PIN</Text>
        </TouchableOpacity>
      )}

      {showSetup && (
        <View style={styles.inlineSetup}>
          <PinLockScreen onUnlock={() => { setPinEnabled(true); setShowSetup(false); }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg0, paddingHorizontal: SPACING.xl,
  },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoIcon: { fontSize: 52, marginBottom: 12 },
  logoText: { fontSize: 28, fontWeight: '700', color: COLORS.accent, letterSpacing: 2 },
  logoSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  dotsRow: {
    flexDirection: 'row', gap: 20, marginBottom: 16,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.accent,
  },
  modeLabel: {
    fontSize: 14, color: COLORS.textSecondary, marginBottom: 8,
  },
  errorText: {
    fontSize: 13, color: COLORS.alert, marginBottom: 8, textAlign: 'center',
  },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 240, marginTop: 24, gap: 12,
  },
  key: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.bg3, borderWidth: 0.5, borderColor: COLORS.bg4,
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: '500', color: COLORS.textPrimary },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.bg4,
  },
  settingLabel: { fontSize: 14, color: COLORS.textPrimary },
  settingSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  toggle: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: COLORS.bg4, position: 'relative',
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', position: 'absolute', top: 2, left: 2,
  },
  changePin: { paddingVertical: 10, alignItems: 'center' },
  changePinText: { color: COLORS.accent, fontSize: 13 },
  inlineSetup: { height: 500 },
});
