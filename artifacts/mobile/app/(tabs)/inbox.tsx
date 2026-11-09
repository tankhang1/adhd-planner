import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BodyText, Card, Eyebrow, Page, PageTitle, SectionHeading } from '@/components/DayflowUI';
import { formatMinutes, toDateKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

export default function InboxScreen() {
  const colors = useColors();
  const { inboxTasks, addInboxTask, toggleInboxTask, scheduleInboxTask, removeInboxTask } = useDayflow();
  const [draft, setDraft] = useState('');
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [planDay, setPlanDay] = useState<0 | 1>(0);
  const [planTime, setPlanTime] = useState(() => {
    const d = new Date();
    return Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes() + 5) / 15) * 15, 23 * 60);
  });

  const confirmPlan = (id: string) => {
    const d = new Date();
    d.setDate(d.getDate() + planDay);
    scheduleInboxTask(id, planTime, toDateKey(d));
    setPlanningId(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addDraft = () => {
    const title = draft.trim();
    if (!title) return;
    addInboxTask(title);
    setDraft('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <Page>
        <View style={styles.header}>
          <Eyebrow>NO NEED TO SORT IT YET</Eyebrow>
          <PageTitle>Get it out of your head.</PageTitle>
          <BodyText style={styles.headerCopy}>
            Catch every thought here. Decide what to do with it when you have room.
          </BodyText>
        </View>

        <Card style={styles.composer}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Add a thought</Text>
          <TextInput
            accessibilityLabel="Task to add to your inbox"
            accessibilityHint="This task is saved on this device."
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addDraft}
            returnKeyType="done"
            placeholder="What’s on your mind?"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            testID="inbox-task-input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add task to inbox"
            accessibilityState={{ disabled: !draft.trim() }}
            disabled={!draft.trim()}
            onPress={addDraft}
            testID="add-inbox-task"
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: colors.primary,
                opacity: !draft.trim() ? 0.45 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>Add to inbox</Text>
          </Pressable>
        </Card>

        <SectionHeading
          title="Your open loops"
          subtitle={`${inboxTasks.length} saved for later`}
        />

        {inboxTasks.length ? (
          <View style={styles.taskList}>
            {inboxTasks.map((task) => (
              <Card key={task.id} style={styles.taskOuter}>
              <View style={styles.taskCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                  accessibilityState={{ selected: task.done }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    toggleInboxTask(task.id);
                  }}
                  testID={`inbox-check-${task.id}`}
                  style={({ pressed }) => [styles.taskMain, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <View
                    style={[
                      styles.checkCircle,
                      { borderColor: task.done ? colors.primary : colors.border, backgroundColor: task.done ? colors.primary : 'transparent' },
                    ]}
                  >
                    {task.done ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                  </View>
                  <Text style={[styles.taskTitle, { color: colors.foreground }, task.done && styles.taskDone]}>
                    {task.title}
                  </Text>
                </Pressable>
                {!task.done ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${task.title} to today's plan`}
                    onPress={() => {
                      setPlanningId(planningId === task.id ? null : task.id);
                      void Haptics.selectionAsync();
                    }}
                    testID={`schedule-${task.id}`}
                    style={({ pressed }) => [
                      styles.scheduleButton,
                      { backgroundColor: colors.secondary, opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <Feather name="calendar" size={15} color={colors.secondaryForeground} />
                    <Text style={[styles.scheduleText, { color: colors.secondaryForeground }]}>Plan</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${task.title}`}
                    onPress={() => removeInboxTask(task.id)}
                    hitSlop={8}
                    testID={`remove-inbox-${task.id}`}
                    style={styles.scheduleButton}
                  >
                    <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
              {planningId === task.id ? (
                <View style={[styles.planner, { borderTopColor: colors.border }]}>
                  <View style={styles.planRow}>
                    {(['Today', 'Tomorrow'] as const).map((label, i) => {
                      const sel = planDay === i;
                      return (
                        <Pressable
                          key={label}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: sel }}
                          onPress={() => setPlanDay(i as 0 | 1)}
                          testID={`plan-day-${i}`}
                          style={[styles.dayChip, { backgroundColor: sel ? colors.primary : colors.muted }]}
                        >
                          <Text style={{ color: sel ? colors.primaryForeground : colors.foreground, fontWeight: '700', fontSize: 13 }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.planRow}>
                    <Pressable accessibilityLabel="15 minutes earlier" onPress={() => setPlanTime((t) => Math.max(0, t - 15))} style={[styles.stepBtn, { backgroundColor: colors.secondary }]}>
                      <Feather name="minus" size={16} color={colors.secondaryForeground} />
                    </Pressable>
                    <Text style={[styles.planTime, { color: colors.foreground }]}>{formatMinutes(planTime)}</Text>
                    <Pressable accessibilityLabel="15 minutes later" onPress={() => setPlanTime((t) => Math.min(23 * 60 + 45, t + 15))} style={[styles.stepBtn, { backgroundColor: colors.secondary }]}>
                      <Feather name="plus" size={16} color={colors.secondaryForeground} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add to timeline"
                      onPress={() => confirmPlan(task.id)}
                      testID={`confirm-plan-${task.id}`}
                      style={[styles.confirm, { backgroundColor: colors.primary }]}
                    >
                      <Feather name="check" size={16} color={colors.primaryForeground} />
                      <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              </Card>
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.sage }]}>
              <Feather name="check" size={19} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your mind has some room.</Text>
            <BodyText>Anything new can wait here until you’re ready.</BodyText>
          </Card>
        )}

        <View style={[styles.note, { backgroundColor: colors.apricot }]}>
          <Feather name="heart" size={16} color={colors.foreground} />
          <Text style={[styles.noteText, { color: colors.foreground }]}>
            Nothing here is overdue. It’s just waiting for you.
          </Text>
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 8 },
  headerCopy: { maxWidth: 350, fontSize: 15, lineHeight: 22 },
  composer: { gap: 11 },
  inputLabel: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 },
  addButton: { minHeight: 46, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontSize: 14, fontWeight: '700' },
  taskList: { gap: 10 },
  taskOuter: { padding: 12 },
  taskCard: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9 },
  planner: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 12, gap: 10 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  planTime: { fontSize: 16, fontWeight: '800', minWidth: 78, textAlign: 'center' },
  confirm: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19 },
  taskMain: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  checkCircle: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  taskDone: { textDecorationLine: 'line-through', opacity: 0.56 },
  scheduleButton: { minHeight: 40, paddingHorizontal: 11, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleText: { fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'flex-start', gap: 10 },
  emptyIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  note: { minHeight: 50, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noteText: { flex: 1, fontSize: 12, fontWeight: '600' },
});
