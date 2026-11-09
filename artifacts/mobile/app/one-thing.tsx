import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMinutes, todayKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { CloudBuddy } from '@/components/CloudBuddy';
import { ActivityIcon } from '@/components/ActivityIcon';
import { currentOrNext, pickForMe } from '@/services/pickForMe';
import type { Suggestion } from '@/services/pickForMe';

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Two modes on one calm screen:
 *  - "One thing" (default): only the current/next task, nothing else.
 *  - "Pick for me" (?pick=1): Dayflow chooses something doable; "another one" reshuffles.
 */
export default function OneThingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const pickMode = pick === '1';
  const { tasksFor, inboxTasks, toggleDayTask, scheduleInboxTask } = useDayflow();
  const today = tasksFor(todayKey());
  const [exclude, setExclude] = useState<string[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const suggestion: Suggestion | null = useMemo(() => {
    if (pickMode) return pickForMe(today, inboxTasks, nowMinutes(), exclude);
    const t = currentOrNext(today.filter((x) => !exclude.includes(x.id)), nowMinutes());
    return t ? { kind: 'task', task: t, reason: '' } : null;
  }, [pickMode, today, inboxTasks, exclude]);

  const task = suggestion?.kind === 'task' ? suggestion.task : undefined;
  const tone = task?.tone ?? 'lilac';
  const ink = colors[`${tone}Ink` as const];
  const title = suggestion?.kind === 'task' ? suggestion.task.title : suggestion?.item.title;

  const skip = () => {
    void Haptics.selectionAsync();
    const id = suggestion?.kind === 'task' ? suggestion.task.id : suggestion?.item.id;
    if (id) setExclude((e) => [...e, id]);
  };

  const startTiny = () => {
    if (!suggestion) return;
    if (suggestion.kind === 'task') {
      router.push({ pathname: '/focus', params: { taskId: suggestion.task.id, tiny: '1' } });
      return;
    }
    // Inbox item: put it on the timeline right now, then start.
    scheduleInboxTask(suggestion.item.id, nowMinutes());
    router.back();
  };

  const done = () => {
    if (!task) return;
    toggleDayTask(task.id);
    setDoneCount((n) => n + 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.screen, { backgroundColor: task ? colors[tone] : colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to full plan" hitSlop={12} onPress={() => router.back()} testID="one-thing-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topLabel, { color: colors.foreground }]}>{pickMode ? 'PICKED FOR YOU' : 'JUST THIS ONE THING'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {suggestion ? (
        <View style={styles.center}>
          {doneCount > 0 ? (
            <View style={[styles.doneChip, { backgroundColor: colors.card }]}>
              <Feather name="check" size={14} color={colors.sageInk} />
              <Text style={[styles.doneChipText, { color: colors.foreground }]}>{doneCount} done just now</Text>
            </View>
          ) : null}
          <View style={[styles.icon, { backgroundColor: colors.card }]}>
            {task ? <ActivityIcon name={task.icon} size={56} color={ink} /> : <Feather name="inbox" size={50} color={colors.primary} />}
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {task ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {formatMinutes(task.start)} · {task.duration} min
            </Text>
          ) : null}
          {suggestion.reason ? <Text style={[styles.reason, { color: colors.mutedForeground }]}>{suggestion.reason}</Text> : null}

          <Pressable accessibilityRole="button" onPress={startTiny} testID="one-thing-start" style={[styles.primary, { backgroundColor: task ? ink : colors.primary }]}>
            <Feather name="feather" size={18} color="#FFFFFF" />
            <Text style={styles.primaryText}>{task ? 'Start with 2 minutes' : 'Do it now'}</Text>
          </Pressable>
          <View style={styles.row}>
            {task ? (
              <Pressable accessibilityRole="button" onPress={done} testID="one-thing-done" style={styles.secondary}>
                <Feather name="check-circle" size={16} color={colors.foreground} />
                <Text style={[styles.secondaryText, { color: colors.foreground }]}>Already done</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={skip} testID="one-thing-skip" style={styles.secondary}>
              <Feather name={pickMode ? 'shuffle' : 'skip-forward'} size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>{pickMode ? 'Another one' : 'Not now'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <CloudBuddy mood={exclude.length ? 'okay' : 'happy'} size={170} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {exclude.length ? 'That’s everything for now' : 'Nothing left to do'}
          </Text>
          <Text style={[styles.reason, { color: colors.mutedForeground }]}>Rest is allowed. You can come back anytime.</Text>
          {exclude.length ? (
            <Pressable accessibilityRole="button" onPress={() => setExclude([])} style={styles.secondary} testID="one-thing-reset">
              <Feather name="rotate-ccw" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Show skipped again</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>Everything else can wait.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  top: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  center: { alignItems: 'center', gap: 12 },
  doneChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 8 },
  doneChipText: { fontSize: 13, fontWeight: '700' },
  icon: { width: 120, height: 120, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', textAlign: 'center', letterSpacing: -0.6, maxWidth: 330 },
  meta: { fontSize: 15, fontWeight: '600' },
  reason: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  primary: { minWidth: 240, minHeight: 58, borderRadius: 29, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 14 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  secondary: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 },
  secondaryText: { fontSize: 15, fontWeight: '600' },
  footer: { fontSize: 12, textAlign: 'center' },
});
