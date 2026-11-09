import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TASK_ICONS, TASK_TONES, formatMinutes, useDayflow } from '@/context/DayflowContext';
import type { TaskIcon, TaskTone } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

const DURATIONS = [5, 15, 25, 30, 45, 60, 90];

function nextQuarter() {
  const d = new Date();
  return Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15, 23 * 60 + 45);
}

export default function AddTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDayTask } = useDayflow();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(nextQuarter);
  const [duration, setDuration] = useState(25);
  const [tone, setTone] = useState<TaskTone>('lilac');
  const [icon, setIcon] = useState<TaskIcon>('star');
  const ink = colors[`${tone}Ink` as const];
  const canSave = title.trim().length > 0;

  const shift = (delta: number) => setStart((s) => Math.max(0, Math.min(s + delta, 23 * 60 + 45)));

  const save = () => {
    if (!canSave) return;
    addDayTask({ title, start, duration, tone, icon });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => router.back()} hitSlop={12} testID="cancel-add">
          <Text style={[styles.topBtn, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>New activity</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save activity" disabled={!canSave} onPress={save} hitSlop={12} testID="save-add">
          <Text style={[styles.topBtn, { color: colors.primary, opacity: canSave ? 1 : 0.4, fontWeight: '700' }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: colors[tone] }]}>
          <View style={[styles.previewIcon, { backgroundColor: colors.card }]}>
            <Feather name={icon} size={24} color={ink} />
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you want to do?"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Activity name"
            testID="add-title"
            style={[styles.input, { color: colors.foreground }]}
          />
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>START</Text>
        <View style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable accessibilityLabel="15 minutes earlier" onPress={() => shift(-15)} style={[styles.stepBtn, { backgroundColor: colors.secondary }]} testID="time-minus">
            <Feather name="minus" size={18} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={[styles.timeValue, { color: colors.foreground }]}>
            {formatMinutes(start)} – {formatMinutes(start + duration)}
          </Text>
          <Pressable accessibilityLabel="15 minutes later" onPress={() => shift(15)} style={[styles.stepBtn, { backgroundColor: colors.secondary }]} testID="time-plus">
            <Feather name="plus" size={18} color={colors.secondaryForeground} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>DURATION</Text>
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
                  {d < 60 ? `${d}m` : `${d / 60}h`.replace('1.5h', '1h 30m')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>COLOR</Text>
        <View style={styles.wrap}>
          {TASK_TONES.map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityLabel={`Color ${t}`}
              accessibilityState={{ selected: t === tone }}
              onPress={() => setTone(t)}
              testID={`tone-${t}`}
              style={[styles.swatch, { backgroundColor: colors[t], borderColor: t === tone ? colors[`${t}Ink` as const] : 'transparent' }]}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>ICON</Text>
        <View style={styles.wrap}>
          {TASK_ICONS.map((i) => {
            const sel = i === icon;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Icon ${i}`}
                accessibilityState={{ selected: sel }}
                onPress={() => setIcon(i)}
                testID={`icon-${i}`}
                style={[styles.iconCell, { backgroundColor: sel ? colors[tone] : colors.card, borderColor: sel ? ink : colors.border }]}
              >
                <Feather name={i} size={20} color={sel ? ink : colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
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
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  iconCell: { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
