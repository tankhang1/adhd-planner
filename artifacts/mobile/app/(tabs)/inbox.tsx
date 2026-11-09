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
import { useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

export default function InboxScreen() {
  const colors = useColors();
  const { inboxTasks, addInboxTask, toggleInboxTask, scheduleInboxTask } = useDayflow();
  const [draft, setDraft] = useState('');

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
              <Card key={task.id} style={styles.taskCard}>
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
                      scheduleInboxTask(task.id);
                      void Haptics.selectionAsync();
                    }}
                    testID={`schedule-${task.id}`}
                    style={({ pressed }) => [
                      styles.scheduleButton,
                      { backgroundColor: colors.secondary, opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <Feather name="calendar" size={15} color={colors.secondaryForeground} />
                    <Text style={[styles.scheduleText, { color: colors.secondaryForeground }]}>Today</Text>
                  </Pressable>
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
  taskCard: { minHeight: 74, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
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
