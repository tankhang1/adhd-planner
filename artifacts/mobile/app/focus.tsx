import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDayflow } from '@/context/DayflowContext';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const RING_SIZE = 260;
const STROKE = 18;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen() {
  const colors = useColors();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { dayTasks, toggleDayTask } = useDayflow();
  const task = dayTasks.find((t) => t.id === taskId);
  const SESSION_SECONDS = (task?.duration ?? 25) * 60;
  const tone = task?.tone ?? 'lilac';
  const ink = colors[`${tone}Ink` as const];
  const [seconds, setSeconds] = useState(SESSION_SECONDS);
  const [running, setRunning] = useState(false);
  const progress = 1 - seconds / SESSION_SECONDS;
  const timeText = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (seconds === 0) {
      setRunning(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [seconds]);

  const toggleTimer = () => {
    if (seconds === 0) {
      setSeconds(SESSION_SECONDS);
      setRunning(true);
      return;
    }
    setRunning((value) => !value);
    void Haptics.selectionAsync();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors[tone] }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close focus timer"
          hitSlop={12}
          onPress={() => router.back()}
          testID="close-focus"
          style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.68 : 1 }]}
        >
          <Feather name="x" size={21} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topLabel, { color: colors.foreground }]}>FOCUS TIME</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.center}>
        <Text style={[styles.prompt, { color: colors.foreground }]}>Just this one thing.</Text>
        <Text style={[styles.taskName, { color: colors.foreground }]}>{task?.title ?? 'Focus session'}</Text>

        <View style={styles.timerWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} accessibilityLabel="Focus session progress">
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={ink}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={`${CIRCUMFERENCE * progress}`}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              fill="none"
            />
          </Svg>
          <View style={styles.timerLabel}>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.timerText, { color: colors.foreground }]}
              testID="focus-countdown"
            >
              {timeText}
            </Text>
            <Text style={[styles.timerCaption, { color: colors.foreground }]}>
              {running ? 'A little more time' : seconds === 0 ? 'You showed up' : 'Ready when you are'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={running ? 'Pause focus session' : seconds === 0 ? 'Start another session' : 'Start focus session'}
          accessibilityState={{ selected: running }}
          onPress={toggleTimer}
          testID="toggle-focus-timer"
          style={({ pressed }) => [
            styles.timerButton,
            { backgroundColor: ink, opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <Feather name={running ? 'pause' : 'play'} size={18} color="#FFFFFF" />
          <Text style={[styles.timerButtonText, { color: '#FFFFFF' }]}>
            {running ? 'Pause' : seconds === 0 ? 'Start again' : 'Start focus'}
          </Text>
        </Pressable>

        {task ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={task.done ? 'Mark not done' : 'Mark done'}
            onPress={() => {
              toggleDayTask(task.id);
              if (!task.done) router.back();
            }}
            testID="focus-done"
            style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.68 : 1 }]}
          >
            <Feather name="check-circle" size={15} color={ink} />
            <Text style={[styles.resetText, { color: ink }]}>{task.done ? 'Mark not done' : 'Mark as done'}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset focus timer"
          onPress={() => {
            setRunning(false);
            setSeconds(SESSION_SECONDS);
          }}
          testID="reset-focus"
          style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.68 : 1 }]}
        >
          <Feather name="rotate-ccw" size={15} color={colors.foreground} />
          <Text style={[styles.resetText, { color: colors.foreground }]}>Reset timer</Text>
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <View style={[styles.bottomRule, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
        <Feather name="heart" size={15} color={ink} />
        <Text style={[styles.bottomCopy, { color: colors.foreground }]}>
          If you drift, you can always begin again.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30, justifyContent: 'space-between' },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  topLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  topSpacer: { width: 44 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  prompt: { fontSize: 25, lineHeight: 31, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  taskName: { fontSize: 14, opacity: 0.78, textAlign: 'center', maxWidth: 260 },
  timerWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  timerLabel: { position: 'absolute', alignItems: 'center', gap: 5 },
  timerText: { fontSize: 50, lineHeight: 58, fontWeight: '600', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  timerCaption: { fontSize: 12, opacity: 0.76 },
  timerButton: { minWidth: 190, minHeight: 54, borderRadius: 19, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  timerButtonText: { fontSize: 15, fontWeight: '700' },
  resetButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 },
  resetText: { fontSize: 13, fontWeight: '600' },
  bottom: { alignItems: 'center', gap: 12, paddingBottom: 10 },
  bottomRule: { width: 42, height: 1, marginBottom: 3 },
  bottomCopy: { fontSize: 12, textAlign: 'center', opacity: 0.8 },
});
