import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REPEAT_PRESETS, TASK_TONES, formatMinutes, fromDateKey, insightFor, isEssential, leaveTimes, todayKey, useDayflow } from '@/context/DayflowContext';
import type { EditScope } from '@/context/DayflowContext';
import type { TaskIcon, TaskTone } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { formatDate, formatDuration, tr, useT } from '@/i18n';
import { ActivityIcon } from '@/components/ActivityIcon';
import { IconPicker } from '@/components/IconPicker';

const DURATIONS = [5, 15, 25, 30, 45, 60, 90];

function nextQuarter() {
  const d = new Date();
  return Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15, 23 * 60 + 45);
}

export default function AddTaskScreen() {
  const colors = useColors();
  useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addDayTask, updateDayTask, removeDayTask, dayTasks, selectedDate, seriesFor, nextFreeStart, timeLog } = useDayflow();
  const existing = id ? dayTasks.find((t) => t.id === id) : undefined;
  const series = existing ? seriesFor(existing) : undefined;
  const initialDays = series?.days ?? [];
  const [repeatDays, setRepeatDays] = useState<number[]>(initialDays);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [start, setStart] = useState(() => {
    if (existing) return existing.start;
    const day = selectedDate;
    // Today: first free slot from now. Other days: first free slot from 8 AM.
    return nextFreeStart(day, day === todayKey() ? nextQuarter() : 8 * 60);
  });
  const [duration, setDuration] = useState(existing?.duration ?? 25);
  const [tone, setTone] = useState<TaskTone>(existing?.tone ?? 'lilac');
  const [icon, setIcon] = useState<TaskIcon>(existing?.icon ?? 'star');
  const date = existing?.date ?? selectedDate;
  const ink = colors[`${tone}Ink` as const];
  const canSave = title.trim().length > 0;
  const insight = insightFor(timeLog, title);
  const [essentialFlag, setEssentialFlag] = useState<boolean>(!!existing?.essential);
  const autoEssential = isEssential({ icon, essential: false });
  const [travel, setTravel] = useState<number>(existing?.travel ?? 0);
  const [prep, setPrep] = useState<number>(existing?.prep ?? 10);
  const trip = leaveTimes({ start, travel, prep });

  const shift = (delta: number) => setStart((s) => Math.max(0, Math.min(s + delta, 23 * 60 + 45)));

  const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));
  const finish = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  /** For repeating tasks, ask whether a change applies to just this day or the whole series. */
  const askScope = (verb: string, onPick: (scope: EditScope) => void) => {
    if (Platform.OS === 'web') return onPick('series');
    Alert.alert(verb === 'Edit' ? tr('addTask.scopeTitleEdit') : tr('addTask.scopeTitleRemove'), tr('addTask.scopeBody'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('addTask.onlyThisDay'), onPress: () => onPick('one') },
      { text: tr('addTask.allFuture'), onPress: () => onPick('series') },
    ]);
  };

  const save = () => {
    if (!canSave) return;
    const fields = { title, start, duration, tone, icon, essential: essentialFlag, travel, prep: travel ? prep : 0 };
    if (!existing) {
      addDayTask({ ...fields, date, repeatDays });
      return finish();
    }
    if (!series) {
      updateDayTask(existing.id, { ...fields, repeatDays });
      return finish();
    }
    // Repeat days changed → must apply to the series.
    if (!sameDays(repeatDays, initialDays)) {
      updateDayTask(existing.id, { ...fields, repeatDays }, 'series');
      return finish();
    }
    askScope('Edit', (scope) => {
      updateDayTask(existing.id, fields, scope);
      finish();
    });
  };

  const remove = () => {
    if (!existing) return;
    const doIt = (scope: EditScope = 'one') => {
      removeDayTask(existing.id, scope);
      router.back();
    };
    if (series) return askScope('Remove', doIt);
    if (Platform.OS === 'web') return doIt();
    Alert.alert(tr('addTask.removeConfirm'), existing.title, [
      { text: tr('addTask.keepIt'), style: 'cancel' },
      { text: tr('addTask.removeBtn'), style: 'destructive', onPress: () => doIt() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('common.cancel')} onPress={() => router.back()} hitSlop={12} testID="cancel-add">
          <Text style={[styles.topBtn, { color: colors.mutedForeground }]}>{tr('common.cancel')}</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>{existing ? tr('addTask.editTitle') : tr('addTask.newTitle')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('addTask.saveA11y')} disabled={!canSave} onPress={save} hitSlop={12} testID="save-add">
          <Text style={[styles.topBtn, { color: colors.primary, opacity: canSave ? 1 : 0.4, fontWeight: '700' }]}>{tr('common.save')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: colors[tone] }]}>
          <View style={[styles.previewIcon, { backgroundColor: colors.card }]}>
            <ActivityIcon name={icon} size={28} color={ink} />
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr('addTask.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            autoFocus={!existing}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel={tr('addTask.nameA11y')}
            testID="add-title"
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {formatDate(fromDateKey(date), { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()} · {tr('addTask.start')}
        </Text>
        <View style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable accessibilityLabel={tr('addTask.earlier')} onPress={() => shift(-15)} style={[styles.stepBtn, { backgroundColor: colors.secondary }]} testID="time-minus">
            <Feather name="minus" size={18} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={[styles.timeValue, { color: colors.foreground }]}>
            {formatMinutes(start)} – {formatMinutes(start + duration)}
          </Text>
          <Pressable accessibilityLabel={tr('addTask.later')} onPress={() => shift(15)} style={[styles.stepBtn, { backgroundColor: colors.secondary }]} testID="time-plus">
            <Feather name="plus" size={18} color={colors.secondaryForeground} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('addTask.repeat')}</Text>
        <View style={styles.wrap}>
          {REPEAT_PRESETS.map((p) => {
            const sel = sameDays(p.days, repeatDays);
            return (
              <Pressable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel }}
                onPress={() => setRepeatDays(p.days)}
                testID={`repeat-${p.key}`}
                style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.card, borderColor: sel ? colors.primary : colors.border }]}
              >
                <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>{tr(p.label)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.weekRow}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => formatDate(new Date(2026, 10, 8 + i), { weekday: 'narrow' })).map((d, i) => {
            const on = repeatDays.includes(i);
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={formatDate(new Date(2026, 10, 8 + i), { weekday: 'long' })}
                onPress={() => setRepeatDays((cur) => (on ? cur.filter((x) => x !== i) : [...cur, i]))}
                testID={`repeat-day-${i}`}
                style={[styles.dayDot, { backgroundColor: on ? colors.secondary : colors.card, borderColor: on ? colors.primary : colors.border }]}
              >
                <Text style={{ color: on ? colors.secondaryForeground : colors.mutedForeground, fontWeight: '700' }}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('addTask.duration')}</Text>
        <View style={styles.wrap}>
          {DURATIONS.map((d) => {
            const sel = d === duration;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                onPress={() => setDuration(d)}
                testID={`duration-${d}`}
                style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.card, borderColor: sel ? colors.primary : colors.border }]}
              >
                <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>
                  {formatDuration(d)}
                </Text>
              </Pressable>
            );
          })}
          {!DURATIONS.includes(duration) ? (
            <View style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.chipText, { color: colors.primaryForeground }]}>{duration}m</Text>
            </View>
          ) : null}
        </View>
        {insight && Math.abs(insight.typicalActual - duration) >= 5 ? (
          <View style={[styles.insight, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={16} color={colors.secondaryForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightText, { color: colors.foreground }]}>
                {tr('addTask.insight', { count: insight.samples, minutes: insight.typicalActual })}
              </Text>
              <Text style={[styles.insightSub, { color: colors.mutedForeground }]}>
                {insight.typicalActual > duration ? tr('addTask.insightMore') : tr('addTask.insightLess')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('addTask.useInsightA11y', { count: insight.typicalActual })}
              onPress={() => setDuration(insight.typicalActual)}
              testID="use-insight"
              style={[styles.insightBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 13 }}>{tr('addTask.useInsight', { count: insight.typicalActual })}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.tripBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tripHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightText, { color: colors.foreground }]}>{tr('addTask.trip')}</Text>
              <Text style={[styles.insightSub, { color: colors.mutedForeground }]}>
                {trip
                  ? tr('addTask.tripOn', { ready: formatMinutes(trip.getReady), leave: formatMinutes(trip.leave) })
                  : tr('addTask.tripOff')}
              </Text>
            </View>
            <Switch
              value={travel > 0}
              onValueChange={(on) => setTravel(on ? 20 : 0)}
              trackColor={{ true: colors.primary, false: colors.input }}
              accessibilityLabel={tr('addTask.trip')}
              testID="toggle-trip"
            />
          </View>
          {travel > 0 ? (
            <>
              <Text style={[styles.tripLabel, { color: colors.mutedForeground }]}>{tr('addTask.travel')}</Text>
              <View style={styles.wrap}>
                {[10, 20, 30, 45, 60].map((m) => {
                  const sel = m === travel;
                  return (
                    <Pressable
                      key={m}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: sel }}
                      onPress={() => setTravel(m)}
                      testID={`travel-${m}`}
                      style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.muted }]}
                    >
                      <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>{formatDuration(m)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.tripLabel, { color: colors.mutedForeground }]}>{tr('addTask.prep')}</Text>
              <View style={styles.wrap}>
                {[5, 10, 15, 30].map((m) => {
                  const sel = m === prep;
                  return (
                    <Pressable
                      key={m}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: sel }}
                      onPress={() => setPrep(m)}
                      testID={`prep-${m}`}
                      style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.muted, borderColor: sel ? colors.primary : colors.muted }]}
                    >
                      <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>{formatDuration(m)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.essentialRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.insightText, { color: colors.foreground }]}>{tr('addTask.essential')}</Text>
            <Text style={[styles.insightSub, { color: colors.mutedForeground }]}>
              {autoEssential
                ? tr('addTask.essentialAuto')
                : tr('addTask.essentialManual')}
            </Text>
          </View>
          <Switch
            value={essentialFlag || autoEssential}
            disabled={autoEssential}
            onValueChange={setEssentialFlag}
            trackColor={{ true: colors.primary, false: colors.input }}
            accessibilityLabel={tr('addTask.essential')}
            testID="toggle-essential"
          />
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('addTask.color')}</Text>
        <View style={styles.wrap}>
          {TASK_TONES.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityLabel={tr('addTask.colorA11y', { name: t })}
              accessibilityState={{ selected: t === tone }}
              onPress={() => setTone(t)}
              testID={`tone-${t}`}
              style={[styles.swatch, { backgroundColor: colors[t], borderColor: t === tone ? colors[`${t}Ink` as const] : 'transparent' }]}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('addTask.icon')}</Text>
        <IconPicker value={icon} onChange={setIcon} fill={colors[tone]} ink={ink} />

        {existing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('addTask.remove')}
            onPress={remove}
            testID="remove-task"
            style={({ pressed }) => [styles.remove, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="trash-2" size={17} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 15 }}>{tr('addTask.remove')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  topBtn: { fontSize: 16 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 30, gap: 10, maxWidth: 600, width: '100%', alignSelf: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, marginBottom: 8 },
  previewIcon: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 20, borderWidth: 1 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timeValue: { fontSize: 17, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, marginTop: 4 },
  insightText: { fontSize: 14, fontWeight: '700' },
  insightSub: { fontSize: 12, marginTop: 2 },
  insightBtn: { paddingHorizontal: 12, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tripBox: { padding: 14, borderRadius: 18, borderWidth: 1, marginTop: 10, gap: 10 },
  tripHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripLabel: { fontSize: 12, fontWeight: '700' },
  essentialRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginTop: 10 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  dayDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, minHeight: 52, borderRadius: 18, borderWidth: 1 },
  iconCell: { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
