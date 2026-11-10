import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/nav';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TASK_TONES, useDayflow } from '@/context/DayflowContext';
import type { TaskIcon, TaskTone } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { tr, useT } from '@/i18n';
import { ActivityIcon } from '@/components/ActivityIcon';
import { IconPicker } from '@/components/IconPicker';

type StepDraft = { key: string; id?: string; title: string; duration: number };
const key = () => Math.random().toString(36).slice(2, 9);

export default function RoutineEditScreen() {
  const colors = useColors();
  useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { routines, saveRoutine, removeRoutine } = useDayflow();
  const existing = id ? routines.find((r) => r.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? '');
  const [tone, setTone] = useState<TaskTone>(existing?.tone ?? 'sage');
  const [icon, setIcon] = useState<TaskIcon>(existing?.icon ?? 'weather-sunny');
  const [steps, setSteps] = useState<StepDraft[]>(
    existing?.steps.map((s) => ({ key: key(), id: s.id, title: s.title, duration: s.duration })) ?? [
      { key: key(), title: '', duration: 5 },
    ],
  );
  const ink = colors[`${tone}Ink` as const];
  const canSave = title.trim().length > 0 && steps.some((s) => s.title.trim());
  const totalMin = steps.reduce((sum, s) => sum + (s.title.trim() ? s.duration : 0), 0);

  const patch = (k: string, p: Partial<StepDraft>) => setSteps((list) => list.map((s) => (s.key === k ? { ...s, ...p } : s)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = () => {
    if (!canSave) return;
    saveRoutine({ title, subtitle, tone, icon, steps: steps.map(({ id: sid, title: t, duration }) => ({ id: sid, title: t, duration })) }, existing?.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goBack();
  };

  const remove = () => {
    if (!existing) return;
    const doIt = () => {
      removeRoutine(existing.id);
      goBack();
    };
    if (Platform.OS === 'web') return doIt();
    Alert.alert(tr('routineEdit.deleteConfirm'), existing.title, [
      { text: tr('routineEdit.keepIt'), style: 'cancel' },
      { text: tr('routineEdit.delete'), style: 'destructive', onPress: doIt },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: insets.bottom }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={() => goBack()} hitSlop={12} testID="routine-cancel">
          <Text style={[styles.topBtn, { color: colors.mutedForeground }]}>{tr('common.cancel')}</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>{existing ? tr('routineEdit.editTitle') : tr('routineEdit.newTitle')}</Text>
        <Pressable accessibilityRole="button" disabled={!canSave} onPress={save} hitSlop={12} testID="routine-save">
          <Text style={[styles.topBtn, { color: colors.primary, fontWeight: '700', opacity: canSave ? 1 : 0.4 }]}>{tr('common.save')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.preview, { backgroundColor: colors[tone] }]}>
          <View style={[styles.previewIcon, { backgroundColor: colors.card }]}>
            <ActivityIcon name={icon} size={28} color={ink} />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={tr('routineEdit.name')}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={tr('routineEdit.name')}
              testID="routine-title"
              style={[styles.titleInput, { color: colors.foreground }]}
            />
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder={tr('routineEdit.description')}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={tr('routineEdit.descriptionA11y')}
              style={[styles.subInput, { color: colors.mutedForeground }]}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('routineEdit.steps', { count: totalMin })}</Text>
        {steps.map((s, i) => (
          <View key={s.key} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reorder}>
              <Pressable accessibilityLabel={tr('routineEdit.moveUp')} onPress={() => move(i, -1)} hitSlop={6} disabled={i === 0}>
                <Feather name="chevron-up" size={16} color={i === 0 ? colors.border : colors.mutedForeground} />
              </Pressable>
              <Pressable accessibilityLabel={tr('routineEdit.moveDown')} onPress={() => move(i, 1)} hitSlop={6} disabled={i === steps.length - 1}>
                <Feather name="chevron-down" size={16} color={i === steps.length - 1 ? colors.border : colors.mutedForeground} />
              </Pressable>
            </View>
            <TextInput
              value={s.title}
              onChangeText={(t) => patch(s.key, { title: t })}
              placeholder={tr('routineEdit.step', { n: i + 1 })}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={tr('routineEdit.stepName', { n: i + 1 })}
              testID={`step-title-${i}`}
              style={[styles.stepInput, { color: colors.foreground }]}
            />
            <Pressable accessibilityLabel={tr('routineEdit.shorter')} onPress={() => patch(s.key, { duration: Math.max(1, s.duration - 1) })} hitSlop={6}>
              <Feather name="minus-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
            <Text style={[styles.dur, { color: colors.foreground }]}>{tr('common.minutes', { count: s.duration })}</Text>
            <Pressable accessibilityLabel={tr('routineEdit.longer')} onPress={() => patch(s.key, { duration: Math.min(120, s.duration + 1) })} hitSlop={6}>
              <Feather name="plus-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              accessibilityLabel={tr('routineEdit.removeStep')}
              onPress={() => setSteps((list) => (list.length > 1 ? list.filter((x) => x.key !== s.key) : list))}
              hitSlop={6}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => setSteps((list) => [...list, { key: key(), title: '', duration: 5 }])}
          testID="add-step"
          style={[styles.addStep, { borderColor: colors.border }]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{tr('routineEdit.addStep')}</Text>
        </Pressable>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('routineEdit.color')}</Text>
        <View style={styles.wrap}>
          {TASK_TONES.map((t) => (
            <Pressable
              key={t}
              accessibilityLabel={tr('addTask.colorA11y', { name: t })}
              accessibilityState={{ selected: t === tone }}
              onPress={() => setTone(t)}
              style={[styles.swatch, { backgroundColor: colors[t], borderColor: t === tone ? colors[`${t}Ink` as const] : 'transparent' }]}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{tr('routineEdit.icon')}</Text>
        <IconPicker value={icon} onChange={setIcon} fill={colors[tone]} ink={ink} />

        {existing ? (
          <Pressable onPress={remove} style={[styles.remove, { borderColor: colors.border }]} testID="routine-delete">
            <Feather name="trash-2" size={17} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: '700' }}>{tr('routineEdit.deleteRoutine')}</Text>
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
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 10, maxWidth: 600, width: '100%', alignSelf: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24 },
  previewIcon: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titleInput: { fontSize: 18, fontWeight: '700', paddingVertical: 4 },
  subInput: { fontSize: 14, paddingVertical: 2 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },
  reorder: { gap: 0 },
  stepInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 8 },
  dur: { fontSize: 14, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  addStep: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  iconCell: { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, minHeight: 52, borderRadius: 18, borderWidth: 1 },
});
