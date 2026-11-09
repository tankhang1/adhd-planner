import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { CloudBuddy } from './CloudBuddy';

const CONFETTI = ['#FF8A65', '#6C5CE7', '#1E9E62', '#2F7FD8', '#E0457B', '#FFC94D'];

function Piece({ i, color }: { i: number; color: string }) {
  const p = useSharedValue(0);
  const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 70 + (i % 4) * 18;
  useEffect(() => {
    p.value = withDelay(i * 12, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [i, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value * 0.9,
    transform: [
      { translateX: Math.cos(angle) * dist * p.value },
      { translateY: Math.sin(angle) * dist * p.value + p.value * p.value * 30 },
      { rotate: `${p.value * 260}deg` },
      { scale: 1 - p.value * 0.4 },
    ],
  }));
  return <Animated.View style={[styles.piece, { backgroundColor: color, borderRadius: i % 2 ? 4 : 1 }, style]} />;
}

/**
 * A tiny, quiet celebration when something gets ticked off:
 * a happy cloud, a little confetti pop and a kind line. No streaks.
 */
export function Celebration({ message, onDone }: { message: string; onDone: () => void }) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const pieces = useMemo(() => Array.from({ length: 14 }, (_, i) => CONFETTI[i % CONFETTI.length]), []);

  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityLiveRegion="polite">
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(220)} style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.burst}>
          {!reduce ? pieces.map((c, i) => <Piece key={i} i={i} color={c} />) : null}
          <CloudBuddy mood="happy" size={90} />
        </View>
        <Text style={[styles.text, { color: colors.foreground }]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 28,
    shadowColor: '#2A1F7A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    maxWidth: 280,
  },
  burst: { width: 120, height: 80, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute', width: 8, height: 8 },
  text: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
