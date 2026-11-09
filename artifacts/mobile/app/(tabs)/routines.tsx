import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BodyText, Eyebrow, Page, PageTitle, ProgressBar } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import type { Routine } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { ActivityIcon } from '@/components/ActivityIcon';

function RoutineCard({ routine }: { routine: Routine }) {
  const colors = useColors();
  const ink = colors[`${routine.tone}Ink` as const];
  const completed = routine.steps.filter((s) => s.done).length;
  const minutes = routine.steps.reduce((sum, s) => sum + s.duration, 0);

  return (
    <View style={[styles.card, { backgroundColor: colors[routine.tone] }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: colors.card }]}>
          <ActivityIcon name={routine.icon} size={26} color={ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{routine.title}</Text>
          <BodyText>
            {routine.steps.length} steps · {minutes} min{routine.subtitle ? ` · ${routine.subtitle}` : ''}
          </BodyText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${routine.title}`}
          hitSlop={10}
          onPress={() => router.push({ pathname: '/routine-edit', params: { id: routine.id } })}
          testID={`routine-edit-${routine.id}`}
          style={[styles.edit, { backgroundColor: colors.card }]}
        >
          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.stepPreview}>
        {routine.steps.slice(0, 4).map((s, i) => (
          <View key={s.id} style={styles.previewRow}>
            <View style={[styles.num, { backgroundColor: s.done ? ink : colors.card }]}>
              {s.done ? (
                <Feather name="check" size={12} color="#FFFFFF" />
              ) : (
                <Text style={[styles.numText, { color: ink }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepText, { color: colors.foreground }, s.done && styles.stepDone]} numberOfLines={1}>
              {s.title}
            </Text>
            <Text style={[styles.stepDur, { color: colors.mutedForeground }]}>{s.duration}m</Text>
          </View>
        ))}
        {routine.steps.length > 4 ? (
          <Text style={[styles.more, { color: colors.mutedForeground }]}>+{routine.steps.length - 4} more</Text>
        ) : null}
      </View>

      {completed > 0 ? <ProgressBar value={completed / routine.steps.length} color={ink} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${completed > 0 ? 'Continue' : 'Start'} ${routine.title}`}
        onPress={() => {
          void Haptics.selectionAsync();
          router.push({ pathname: '/routine-run', params: { id: routine.id } });
        }}
        testID={`routine-start-${routine.id}`}
        style={({ pressed }) => [styles.start, { backgroundColor: ink, opacity: pressed ? 0.85 : 1 }]}
      >
        <Feather name="play" size={17} color="#FFFFFF" />
        <Text style={styles.startText}>{completed > 0 ? 'Continue' : 'Start step by step'}</Text>
      </Pressable>
    </View>
  );
}

export default function RoutinesScreen() {
  const { routines } = useDayflow();
  const colors = useColors();
  return (
    <Page>
      <View style={styles.header}>
        <Eyebrow>REPEATABLE, NOT RIGID</Eyebrow>
        <PageTitle>Routines</PageTitle>
        <BodyText style={styles.headerCopy}>
          One step at a time, with a timer for each. Skip anything — it still counts.
        </BodyText>
      </View>

      {routines.map((r) => <RoutineCard key={r.id} routine={r} />)}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/routine-edit')}
        testID="new-routine"
        style={({ pressed }) => [styles.newBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name="plus" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>New routine</Text>
      </Pressable>

      <View style={[styles.reassurance, { backgroundColor: colors.secondary }]}>
        <Feather name="heart" size={16} color={colors.primary} />
        <Text style={[styles.reassuranceText, { color: colors.secondaryForeground }]}>
          No streaks here. Your routines never change unless you change them.
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  headerCopy: { maxWidth: 350, fontSize: 15, lineHeight: 22 },
  card: { borderRadius: 26, padding: 16, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  edit: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepPreview: { gap: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, fontWeight: '500' },
  stepDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  stepDur: { fontSize: 12, fontWeight: '600' },
  more: { fontSize: 12, fontWeight: '600', marginLeft: 34 },
  start: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 25 },
  startText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed' },
  reassurance: { minHeight: 52, borderRadius: 17, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reassuranceText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
