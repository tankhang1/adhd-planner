import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { CloudBuddy } from '@/components/CloudBuddy';
import { ActivityIcon } from '@/components/ActivityIcon';
import { BuddyDialog, DialogButton } from '@/components/BuddyDialog';
import { tr, useT } from '@/i18n';
import type { Treat } from '@/context/DayflowContext';
import { FocusSounds } from '@/components/FocusSounds';
import { usePro } from '@/context/ProContext';
import { AiError, aiAvailable, aiBreakDown, type AiStep } from '@/services/ai';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

/** Body double: a little cloud that breathes slowly beside you while you work. */
function BodyDouble() {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    s.value = withRepeat(withTiming(1.08, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const colors = useColors();
  return (
    <View style={styles.bodyDouble} accessibilityLabel={tr('focus.withYou')}>
      <Animated.View style={style}>
        <CloudBuddy mood="okay" size={44} />
      </Animated.View>
      <Text style={[styles.bodyDoubleText, { color: colors.mutedForeground }]}>{tr('focus.withYou')}</Text>
    </View>
  );
}

const RING_SIZE = 260;
const STROKE = 18;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
export const TINY_SECONDS = 2 * 60;

/** idle → (tiny | full) running → checkpoint (after tiny) → full running → done */
type Phase = 'idle' | 'tiny' | 'checkpoint' | 'full' | 'done';

export default function FocusScreen() {
  const colors = useColors();
  useT();
  const insets = useSafeAreaInsets();
  const { taskId, tiny, left } = useLocalSearchParams<{ taskId?: string; tiny?: string; left?: string }>();
  const { dayTasks, toggleDayTask, extendTask, logTime, treats, addDayTask, nextFreeStart, saveRoutine } = useDayflow();
  const { isPro, offerPro } = usePro();
  const [steps, setSteps] = useState<AiStep[] | null>(null);
  const [breaking, setBreaking] = useState(false);
  const breakItDown = async () => {
    if (!task || breaking) return;
    if (!isPro && !(await offerPro(tr('ai.proTitle'), tr('ai.proBody'), 'ai'))) return;
    setBreaking(true);
    try {
      const r = await aiBreakDown(task.title, task.duration);
      setSteps(r.steps);
    } catch (e) {
      Alert.alert(tr(`ai.error_${e instanceof AiError ? e.code : 'unavailable'}`));
    } finally {
      setBreaking(false);
    }
  };
  const [treat, setTreat] = useState<Treat | null>(null);
  const task = dayTasks.find((t) => t.id === taskId);
  const fullSeconds = (task?.duration ?? 25) * 60;
  const tone = task?.tone ?? 'lilac';
  const ink = colors[`${tone}Ink` as const];

  // Dev-only (screenshot scenes): resume mid-session. Ignored in release builds.
  const resume = __DEV__ && left ? Math.min(fullSeconds, Math.max(1, Number(left))) : 0;
  const [phase, setPhase] = useState<Phase>(tiny === '1' ? 'tiny' : resume ? 'full' : 'idle');
  const [total, setTotal] = useState(tiny === '1' ? TINY_SECONDS : fullSeconds);
  const [seconds, setSeconds] = useState(resume || total);
  const [running, setRunning] = useState(tiny === '1' || !!resume);
  /** Seconds actually spent working on this task in this session (for time learning). */
  const [worked, setWorked] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
      setWorked((w) => w + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || !running) return;
    setRunning(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase((p) => (p === 'tiny' ? 'checkpoint' : 'done'));
  }, [seconds, running]);

  const begin = (mode: 'tiny' | 'full', length: number) => {
    void Haptics.selectionAsync();
    setPhase(mode);
    setTotal(length);
    setSeconds(length);
    setRunning(true);
  };

  const keepGoing = () => begin('full', Math.max(60, fullSeconds - TINY_SECONDS));

  /** +N minutes: longer timer, longer block, and the rest of the day slides later. */
  const extend = (minutes: number) => {
    if (task) extendTask(task.id, minutes, true);
    void Haptics.selectionAsync();
    if (phase === 'done') {
      begin('full', minutes * 60);
      return;
    }
    setTotal((t) => t + minutes * 60);
    setSeconds((sec) => sec + minutes * 60);
  };

  const markDone = () => {
    if (task && worked >= 60) logTime(task, worked / 60);
    if (task && !task.done) toggleDayTask(task.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // After a real stretch of effort, offer something from the dopamine menu.
    if (task && task.duration >= 20 && treats.length) {
      setTreat(treats[Math.floor(Math.random() * treats.length)]);
      return;
    }
    goBack();
  };

  const takeTreat = () => {
    if (treat && task) {
      const now = new Date();
      addDayTask({
        title: treat.title,
        start: nextFreeStart(task.date, now.getHours() * 60 + now.getMinutes()),
        duration: treat.minutes,
        tone: 'lemon',
        icon: treat.icon,
        date: task.date,
        label: 'Treat',
      });
    }
    setTreat(null);
    goBack();
  };

  const progress = total ? 1 - seconds / total : 0;
  const timeText = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const caption =
    phase === 'idle' ? tr('focus.ready')
    : phase === 'tiny' ? (running ? tr('focus.tinyRunning') : tr('focus.paused'))
    : phase === 'full' ? (running ? tr('focus.running') : tr('focus.paused'))
    : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors[tone], paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('focus.closeA11y')} hitSlop={12} onPress={() => goBack()} testID="close-focus">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topLabel, { color: colors.foreground }]}>
          {phase === 'tiny' ? tr('focus.labelTiny') : tr('focus.labelFocus')}
        </Text>
        {task ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('focus.editA11y')}
            hitSlop={12}
            onPress={() => router.push({ pathname: '/add-task', params: { id: task.id } })}
            testID="focus-edit"
          >
            <Feather name="edit-2" size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      {phase === 'tiny' || phase === 'full' || phase === 'idle' ? <FocusSounds running={running} ink={ink} /> : null}

      <View style={styles.center}>
        <View style={[styles.taskIcon, { backgroundColor: colors.card }]}>
          <ActivityIcon name={task?.icon ?? 'target'} size={28} color={ink} />
        </View>
        <Text style={[styles.taskName, { color: colors.foreground }]}>{task?.title ?? tr('focus.fallbackTitle')}</Text>

        {phase === 'checkpoint' || phase === 'done' ? (
          <View style={styles.checkpoint}>
            <CloudBuddy mood="happy" size={170} />
            <Text style={[styles.prompt, { color: colors.foreground }]}>
              {phase === 'done' ? tr('focus.didIt') : tr('focus.started')}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {phase === 'done'
                ? tr('focus.didItBody', { spent: Math.round(worked / 60), planned: task?.duration ?? Math.round(fullSeconds / 60) })
                : tr('focus.startedBody')}
            </Text>
            {phase === 'checkpoint' ? (
              <>
                <Pressable accessibilityRole="button" onPress={keepGoing} testID="tiny-keep-going" style={[styles.primary, { backgroundColor: ink }]}>
                  <Feather name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>{tr('focus.keepGoing')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => goBack()} testID="tiny-stop" style={styles.secondary}>
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>{tr('focus.stopHere')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={markDone} testID="focus-mark-done" style={[styles.primary, { backgroundColor: ink }]}>
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>{tr('focus.markDone')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityHint={tr('focus.plus10Hint')} onPress={() => extend(10)} testID="focus-plus-10" style={styles.secondary}>
                  <Feather name="plus" size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>{tr('focus.moreMinutes')}</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.timerWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE} accessibilityLabel={tr('focus.progressA11y')}>
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke={colors.onTone} strokeWidth={STROKE} fill="none" />
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
                <Text accessibilityLiveRegion="polite" style={[styles.timerText, { color: colors.foreground }]} testID="focus-countdown">
                  {timeText}
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>{caption}</Text>
              </View>
            </View>

            {phase === 'idle' ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={tr('focus.justTwoHint')}
                  onPress={() => begin('tiny', TINY_SECONDS)}
                  testID="start-tiny"
                  style={[styles.primary, { backgroundColor: ink }]}
                >
                  <Feather name="feather" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>{tr('focus.justTwo')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => begin('full', fullSeconds)} testID="start-full" style={styles.secondary}>
                  <Feather name="play" size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryText, { color: colors.foreground }]}>{tr('focus.full', { count: Math.round(fullSeconds / 60) })}</Text>
                </Pressable>
                {task && aiAvailable() ? (
                  <Pressable accessibilityRole="button" onPress={() => void breakItDown()} testID="ai-breakdown" style={styles.secondary}>
                    <Feather name={breaking ? 'loader' : 'zap'} size={16} color={colors.foreground} />
                    <Text style={[styles.secondaryText, { color: colors.foreground }]}>{breaking ? tr('ai.thinking') : tr('ai.breakDown')}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={running ? tr('focus.pause') : tr('focus.resume')}
                  onPress={() => setRunning((r) => !r)}
                  testID="toggle-focus-timer"
                  style={[styles.primary, { backgroundColor: ink }]}
                >
                  <Feather name={running ? 'pause' : 'play'} size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>{running ? tr('focus.pause') : tr('focus.resume')}</Text>
                </Pressable>
                <View style={styles.inline}>
                  {phase === 'full' ? (
                    <Pressable accessibilityRole="button" accessibilityHint={tr('focus.plus10Hint')} onPress={() => extend(10)} testID="focus-extend" style={styles.secondary}>
                      <Feather name="plus" size={16} color={colors.foreground} />
                      <Text style={[styles.secondaryText, { color: colors.foreground }]}>{tr('focus.plus10')}</Text>
                    </Pressable>
                  ) : null}
                  {task ? (
                    <Pressable accessibilityRole="button" onPress={markDone} testID="focus-done" style={styles.secondary}>
                      <Feather name="check-circle" size={16} color={colors.foreground} />
                      <Text style={[styles.secondaryText, { color: colors.foreground }]}>{tr('focus.done')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </>
        )}
      </View>

      {running ? <BodyDouble /> : <Text style={[styles.footer, { color: colors.mutedForeground }]}>{tr('focus.footer')}</Text>}

      <BuddyDialog
        visible={!!steps}
        mood="happy"
        title={tr('ai.stepsTitle')}
        message={steps?.map((st, i) => `${i + 1}. ${st.title} · ${tr('common.minutes', { count: st.minutes })}`).join('\n')}
        onClose={() => setSteps(null)}
      >
        <DialogButton label={tr('ai.startFirst')} testID="ai-steps-start" onPress={() => {
          setSteps(null);
          begin('tiny', TINY_SECONDS);
        }} />
        <DialogButton
          label={tr('ai.saveRoutine')}
          variant="secondary"
          testID="ai-steps-routine"
          onPress={() => {
            if (task && steps) {
              saveRoutine({ title: task.title, subtitle: tr('ai.routineSub'), tone: task.tone, icon: task.icon, steps: steps.map((st) => ({ title: st.title, duration: st.minutes })) });
            }
            setSteps(null);
          }}
        />
      </BuddyDialog>

      <BuddyDialog
        visible={!!treat}
        mood="happy"
        title={tr('focus.treatTitle')}
        message={treat ? tr('focus.treatMessage', { title: treat.title, count: treat.minutes }) : undefined}
        onClose={() => {
          setTreat(null);
          goBack();
        }}
      >
        <DialogButton label={tr('focus.treatYes')} testID="treat-yes" onPress={takeTreat} />
        <DialogButton
          label={tr('focus.treatNo')}
          variant="text"
          testID="treat-no"
          onPress={() => {
            setTreat(null);
            goBack();
          }}
        />
      </BuddyDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyDouble: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bodyDoubleText: { fontSize: 13, fontWeight: '600' },
  screen: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  center: { alignItems: 'center', gap: 12 },
  taskIcon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  taskName: { fontSize: 22, lineHeight: 28, fontWeight: '800', textAlign: 'center', maxWidth: 320 },
  timerWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  timerLabel: { position: 'absolute', alignItems: 'center', gap: 5, paddingHorizontal: 30 },
  timerText: { fontSize: 52, lineHeight: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  checkpoint: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  prompt: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  primary: { minWidth: 220, minHeight: 56, borderRadius: 28, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondary: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
  inline: { flexDirection: 'row', gap: 6 },
  footer: { fontSize: 12, textAlign: 'center' },
});
