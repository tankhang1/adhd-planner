import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TASK_TONES, formatMinutes, fromDateKey, toDateKey, todayKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { formatDuration, tr } from '@/i18n';
import { parseQuickAdd } from '@/services/quickParse';
import { usePro } from '@/context/ProContext';
import { FREE_RECURRING } from '@/lib/limits';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_DURATION = 30;

const nextQuarter = () => {
  const d = new Date();
  return Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 15) * 15;
};

/** One line → one activity. "gym 6pm 45m" lands on the timeline without opening a form. */
export function QuickAddBar({ date }: { date: string }) {
  const colors = useColors();
  const { addDayTask, nextFreeStart, dayTasks, recurring } = useDayflow();
  const { isPro, offerPro } = usePro();
  /** Manual override of the repeat chip; null = follow what was typed. */
  const [repeatOverride, setRepeatOverride] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const targetDate = useMemo(() => {
    if (!parsed.dayOffset) return date;
    const d = fromDateKey(todayKey());
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
  }, [parsed.dayOffset, date]);

  const start =
    parsed.start ?? nextFreeStart(targetDate, targetDate === todayKey() ? nextQuarter() : 8 * 60);
  const duration = parsed.duration ?? DEFAULT_DURATION;
  const ready = parsed.title.length > 0;
  const repeatDays = repeatOverride === null ? parsed.repeatDays : repeatOverride ? (parsed.repeatDays.length ? parsed.repeatDays : EVERY_DAY) : [];
  const repeatLabel =
    repeatDays.length === 7 ? tr('addTask.repeatDaily')
    : repeatDays.length === 5 ? tr('addTask.repeatWeekdays')
    : repeatDays.length === 2 ? tr('addTask.repeatWeekends')
    : tr('quickAdd.repeat');

  const submit = async () => {
    if (!ready) return;
    if (repeatDays.length && !isPro && recurring.length >= FREE_RECURRING) {
      const ok = await offerPro(tr('settings.proRecurringTitle'), tr('settings.proRecurringBody', { count: FREE_RECURRING }), 'recurring');
      if (!ok) return;
    }
    addDayTask({
      repeatDays,
      title: parsed.title,
      start,
      duration,
      date: targetDate,
      // Rotate colours so a quickly built day still looks lively.
      tone: TASK_TONES[dayTasks.length % TASK_TONES.length],
      icon: 'star',
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setText('');
    setRepeatOverride(null);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Feather name="zap" size={16} color={colors.primary} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void submit()}
          placeholder={tr('quickAdd.placeholder')}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          blurOnSubmit={false}
          accessibilityLabel={tr('quickAdd.a11y')}
          testID="quick-add-input"
          style={[styles.input, { color: colors.foreground }]}
        />
        {ready ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('quickAdd.add')}
            onPress={() => void submit()}
            hitSlop={8}
            testID="quick-add-submit"
            style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="arrow-up" size={16} color={colors.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
      {ready ? (
        <View style={styles.preview} accessibilityLiveRegion="polite">
          {parsed.dayOffset ? <Chip icon="sunrise" label={tr('quickAdd.tomorrow')} /> : null}
          <Chip icon="clock" label={formatMinutes(start)} guessed={parsed.start == null} />
          <Chip icon="watch" label={formatDuration(duration)} guessed={parsed.duration == null} />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: repeatDays.length > 0 }}
            accessibilityLabel={tr('quickAdd.repeat')}
            onPress={() => {
              void Haptics.selectionAsync();
              setRepeatOverride(!(repeatDays.length > 0));
            }}
            hitSlop={6}
            testID="quick-add-repeat"
          >
            <Chip icon="repeat" label={repeatLabel} guessed={repeatDays.length === 0} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ icon, label, guessed }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; guessed?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: guessed ? colors.muted : colors.secondary }]}>
      <Feather name={icon} size={12} color={guessed ? colors.mutedForeground : colors.secondaryForeground} />
      <Text style={[styles.chipText, { color: guessed ? colors.mutedForeground : colors.secondaryForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 8 },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
