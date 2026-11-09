import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BodyText, Card, Eyebrow, Page, PageTitle, ProgressBar, PrimaryButton, SectionHeading } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import type { Routine } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

function RoutineCard({ routine }: { routine: Routine }) {
  const colors = useColors();
  const { activeRoutineId, setActiveRoutineId, toggleRoutineStep } = useDayflow();
  const completed = routine.steps.filter((step) => step.done).length;
  const active = activeRoutineId === routine.id;

  return (
    <Card style={styles.routineCard}>
      <View style={styles.routineHeading}>
        <View style={[styles.routineIcon, { backgroundColor: colors[routine.tone] }]}>
          <Feather
            name={routine.id === 'morning' ? 'sunrise' : 'moon'}
            size={18}
            color={colors.foreground}
          />
        </View>
        <View style={styles.routineCopy}>
          <Text style={[styles.routineTitle, { color: colors.foreground }]}>{routine.title}</Text>
          <BodyText>{routine.subtitle} · {routine.steps.reduce((sum, step) => sum + step.duration, 0)} min</BodyText>
        </View>
        <Text style={[styles.stepCount, { color: colors.mutedForeground }]}>
          {completed}/{routine.steps.length}
        </Text>
      </View>

      <ProgressBar
        value={routine.steps.length ? completed / routine.steps.length : 0}
        color={colors.primary}
      />

      <View style={styles.steps}>
        {routine.steps.map((step, index) => (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            accessibilityLabel={`${step.done ? 'Mark incomplete' : 'Mark complete'}: ${step.title}`}
            accessibilityState={{ selected: step.done }}
            onPress={() => {
              void Haptics.selectionAsync();
              toggleRoutineStep(routine.id, step.id);
            }}
            testID={`routine-step-${step.id}`}
            style={({ pressed }) => [styles.stepRow, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View style={[styles.stepNumber, { backgroundColor: step.done ? colors.primary : colors.muted }]}>
              {step.done ? (
                <Feather name="check" size={13} color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.stepNumberText, { color: colors.mutedForeground }]}>{index + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground }, step.done && styles.stepDone]}>
              {step.title}
            </Text>
            <Text style={[styles.stepDuration, { color: colors.mutedForeground }]}>{step.duration}m</Text>
          </Pressable>
        ))}
      </View>

      <PrimaryButton
        title={active ? 'Pause this routine' : 'Start this routine'}
        icon={active ? 'pause' : 'play'}
        onPress={() => {
          void Haptics.selectionAsync();
          setActiveRoutineId(active ? null : routine.id);
        }}
        testID={`routine-start-${routine.id}`}
      />
      {active ? (
        <Text style={[styles.activeNote, { color: colors.primary }]}>
          You’re here now. Take each step at your own pace.
        </Text>
      ) : null}
    </Card>
  );
}

export default function RoutinesScreen() {
  const { routines } = useDayflow();
  const colors = useColors();
  return (
    <Page>
      <View style={styles.header}>
        <Eyebrow>REPEATABLE, NOT RIGID</Eyebrow>
        <PageTitle>Small steps count.</PageTitle>
        <BodyText style={styles.headerCopy}>
          Familiar rhythms can make the next thing easier. Skip or change any step.
        </BodyText>
      </View>
      <SectionHeading title="Your routines" subtitle="Pick the one that fits this moment." />
      {routines.map((routine) => <RoutineCard key={routine.id} routine={routine} />)}
      <View style={[styles.reassurance, { backgroundColor: colors.secondary }]}>
        <Feather name="heart" size={16} color={colors.primary} />
        <Text style={[styles.reassuranceText, { color: colors.secondaryForeground }]}>
          There are no streaks here. Coming back is enough.
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  headerCopy: { maxWidth: 350, fontSize: 15, lineHeight: 22 },
  routineCard: { gap: 17 },
  routineHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  routineIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  routineCopy: { flex: 1, gap: 3 },
  routineTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  stepCount: { fontSize: 12, fontWeight: '600' },
  steps: { gap: 4 },
  stepRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: { width: 25, height: 25, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 11, fontWeight: '700' },
  stepTitle: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  stepDone: { textDecorationLine: 'line-through', opacity: 0.58 },
  stepDuration: { fontSize: 11 },
  activeNote: { fontSize: 12, textAlign: 'center', fontWeight: '600' },
  reassurance: { minHeight: 52, borderRadius: 17, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reassuranceText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
