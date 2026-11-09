import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

const SIZE = 250;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function RoutineRunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { routines, setRoutineStepDone, resetRoutine, setActiveRoutineId } = useDayflow();
  const routine = routines.find((r) => r.id === id);

  const firstOpen = useMemo(() => Math.max(0, routine?.steps.findIndex((s) => !s.done) ?? 0), [routine?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(firstOpen);
  const step = routine?.steps[index];
  const total = (step?.duration ?? 1) * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(true);
  const finished = !!routine && index >= routine.steps.length;

  useEffect(() => {
    setActiveRoutineId(routine?.id ?? null);
    return () => setActiveRoutineId(null);
  }, [routine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLeft(total);
    setRunning(true);
  }, [index, total]);

  useEffect(() => {
    if (!running || finished) return;
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [running, finished]);

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [left, running]);

  if (!routine) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
        <Text style={{ color: colors.foreground }}>Routine not found.</Text>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>Go back</Text></Pressable>
      </View>
    );
  }

  const ink = colors[`${routine.tone}Ink` as const];
  const advance = (markDone: boolean) => {
    if (step) setRoutineStepDone(routine.id, step.id, markDone);
    void Haptics.selectionAsync();
    setIndex((i) => i + 1);
  };
  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = (left % 60).toString().padStart(2, '0');

  return (
    <View style={[styles.screen, { backgroundColor: colors[routine.tone], paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close routine" hitSlop={12} onPress={() => router.back()} testID="close-routine">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>{routine.title}</Text>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {Math.min(index + 1, routine.steps.length)}/{routine.steps.length}
        </Text>
      </View>

      <View style={styles.progressRow}>
        {routine.steps.map((s, i) => (
          <View
            key={s.id}
            style={[styles.seg, { backgroundColor: i < index ? ink : i === index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)' }]}
          />
        ))}
      </View>

      {finished ? (
        <View style={styles.center}>
          <View style={[styles.doneBadge, { backgroundColor: colors.card }]}>
            <Feather name="check" size={56} color={ink} />
          </View>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>Routine complete</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {routine.steps.filter((s) => s.done).length} of {routine.steps.length} steps done — that counts.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              resetRoutine(routine.id);
              router.back();
            }}
            testID="routine-finish"
            style={[styles.primary, { backgroundColor: ink }]}
          >
            <Text style={styles.primaryText}>Finish</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={[styles.label, { color: ink }]}>NOW</Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step?.title}</Text>

          <View style={styles.ring}>
            <Svg width={SIZE} height={SIZE}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.7)" strokeWidth={STROKE} fill="none" />
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${C}`}
                strokeDashoffset={`${C * (1 - left / total)}`}
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
                fill="none"
              />
            </Svg>
            <View style={styles.ringLabel}>
              <Text style={[styles.time, { color: colors.foreground }]} accessibilityLiveRegion="polite">{mm}:{ss}</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {left === 0 ? 'Time’s up — whenever you’re ready' : running ? 'take your time' : 'paused'}
              </Text>
            </View>
          </View>

          {routine.steps[index + 1] ? (
            <Text style={[styles.next, { color: colors.mutedForeground }]}>Next: {routine.steps[index + 1].title}</Text>
          ) : (
            <Text style={[styles.next, { color: colors.mutedForeground }]}>Last step!</Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Step done"
            onPress={() => advance(true)}
            testID="step-done"
            style={({ pressed }) => [styles.primary, { backgroundColor: ink, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable accessibilityRole="button" onPress={() => setRunning((r) => !r)} style={styles.secondary} testID="step-pause">
              <Feather name={running ? 'pause' : 'play'} size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>{running ? 'Pause' : 'Resume'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setLeft((v) => v + 60)} style={styles.secondary} testID="step-plus">
              <Feather name="plus" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>1 min</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => advance(false)} style={styles.secondary} testID="step-skip">
              <Feather name="skip-forward" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Skip</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 22 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  topTitle: { fontSize: 15, fontWeight: '700' },
  counter: { fontSize: 14, fontWeight: '700', minWidth: 24, textAlign: 'right' },
  progressRow: { flexDirection: 'row', gap: 5, marginTop: 14 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  stepTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, maxWidth: 320 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  ringLabel: { position: 'absolute', alignItems: 'center', gap: 4 },
  time: { fontSize: 52, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, textAlign: 'center' },
  next: { fontSize: 14, fontWeight: '600' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 200, minHeight: 56, borderRadius: 28, marginTop: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 6 },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  doneBadge: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
});
