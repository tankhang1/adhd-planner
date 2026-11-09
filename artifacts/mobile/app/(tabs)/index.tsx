import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card, Eyebrow, Page, PageTitle, ProgressBar, SectionHeading, Tag } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

function TaskTimelineRow({
  task,
  onToggle,
}: {
  task: DayTask;
  onToggle: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text style={[styles.taskTime, { color: colors.mutedForeground }]}>{task.time}</Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.railDot, { backgroundColor: colors[task.tone] }]} />
        <View style={[styles.railLine, { backgroundColor: colors.border }]} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        accessibilityState={{ selected: task.done }}
        onPress={onToggle}
        testID={`task-${task.id}`}
        style={({ pressed }) => [
          styles.taskCard,
          {
            backgroundColor: task.done ? colors.muted : colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <View style={styles.taskTopLine}>
          <Tag background={colors[task.tone]} foreground={colors.foreground}>{task.label}</Tag>
          <View style={styles.duration}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
              {task.duration} min
            </Text>
          </View>
        </View>
        <View style={styles.taskTitleRow}>
          <Text
            style={[
              styles.taskTitle,
              { color: colors.foreground },
              task.done && styles.completedTask,
            ]}
          >
            {task.title}
          </Text>
          <Feather
            name={task.done ? 'check-circle' : 'circle'}
            size={20}
            color={task.done ? colors.primary : colors.mutedForeground}
          />
        </View>
      </Pressable>
    </View>
  );
}

function NowMarker({ time }: { time: string }) {
  const colors = useColors();
  return (
    <View style={styles.timelineRow} accessibilityLabel={`Current time, ${time}`}>
      <View style={styles.timeColumn}>
        <Text style={[styles.taskTime, { color: colors.accent }]}>{time}</Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.nowDot, { backgroundColor: colors.accent }]} />
        <View style={[styles.nowLine, { backgroundColor: colors.accent }]} />
      </View>
      <View style={styles.nowLabelWrap}>
        <View style={[styles.nowLabel, { backgroundColor: colors.apricot }]}>
          <Text style={[styles.nowLabelText, { color: colors.foreground }]}>NOW</Text>
        </View>
      </View>
    </View>
  );
}

function timeValue(value: string) {
  const [clockPart = '12:00', meridiem = 'AM'] = value.split(' ');
  const [hourPart = '12', minutePart = '0'] = clockPart.split(':');
  let hour = Number(hourPart) % 12;
  if (meridiem === 'PM') hour += 12;
  return hour * 60 + Number(minutePart);
}

export default function TodayScreen() {
  const colors = useColors();
  const { dayTasks, toggleDayTask } = useDayflow();
  const [clock, setClock] = useState(() => new Date());
  const completed = dayTasks.filter((task) => task.done).length;
  const sortedTasks = [...dayTasks].sort((a, b) => timeValue(a.time) - timeValue(b.time));
  const currentMinutes = clock.getHours() * 60 + clock.getMinutes();
  const nowIndex = sortedTasks.findIndex((task) => timeValue(task.time) > currentMinutes);
  const currentTimeLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(clock);
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(clock);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Page>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Feather name="sunrise" size={17} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>dayflow</Text>
        </View>
        <View style={[styles.datePill, { backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={14} color={colors.secondaryForeground} />
          <Text style={[styles.datePillText, { color: colors.secondaryForeground }]}>
            {dateLabel}
          </Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Eyebrow>ONE THING AT A TIME</Eyebrow>
        <PageTitle>Your day, at your pace.</PageTitle>
        <Text style={[styles.introCopy, { color: colors.mutedForeground }]}>
          You don’t have to do it all. Let’s find the next small step.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a 25 minute focus session"
        onPress={() => router.push('/focus')}
        testID="start-focus"
        style={({ pressed }) => [
          styles.focusCard,
          { backgroundColor: colors.forest, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={styles.focusCardTop}>
          <View>
            <Text style={[styles.focusEyebrow, { color: colors.onForest }]}>A GOOD PLACE TO START</Text>
            <Text style={[styles.focusTitle, { color: colors.onForest }]}>Review the project brief</Text>
            <Text style={[styles.focusMeta, { color: colors.onForest }]}>25 minutes · one thing only</Text>
          </View>
          <View style={[styles.focusPlay, { backgroundColor: colors.accent }]}>
            <Feather name="play" size={18} color={colors.accentForeground} />
          </View>
        </View>
        <View style={styles.focusBottom}>
          <View style={styles.focusProgressTrack}>
            <View style={[styles.focusProgressFill, { backgroundColor: colors.accent }]} />
          </View>
          <Text style={[styles.focusHint, { color: colors.onForest }]}>Start a focus session</Text>
        </View>
      </Pressable>

      <View style={styles.progressBlock}>
        <View style={styles.progressCopy}>
          <Text style={[styles.progressTitle, { color: colors.foreground }]}>A little progress</Text>
          <Text style={[styles.progressCount, { color: colors.mutedForeground }]}>
            {completed} of {dayTasks.length} planned
          </Text>
        </View>
        <ProgressBar value={dayTasks.length ? completed / dayTasks.length : 0} color={colors.accent} />
      </View>

      <View style={styles.scheduleHeader}>
        <SectionHeading
          title="Today’s flow"
          subtitle="A flexible plan, not a perfect one."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your task inbox"
          onPress={() => router.push('/(tabs)/inbox')}
          testID="open-inbox"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color={colors.secondaryForeground} />
        </Pressable>
      </View>

      {dayTasks.length ? (
        <View style={styles.timeline}>
          {sortedTasks.map((task, index) => (
            <React.Fragment key={task.id}>
              {index === nowIndex ? <NowMarker time={currentTimeLabel} /> : null}
              <TaskTimelineRow
                task={task}
                onToggle={() => {
                  void Haptics.selectionAsync();
                  toggleDayTask(task.id);
                }}
              />
            </React.Fragment>
          ))}
          {nowIndex === -1 ? <NowMarker time={currentTimeLabel} /> : null}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Feather name="sun" size={22} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>An open day</Text>
          <Text style={[styles.introCopy, { color: colors.mutedForeground }]}>
            Add one small thing when you’re ready.
          </Text>
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  brandName: { fontSize: 19, fontWeight: '700', letterSpacing: -0.6 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 16 },
  datePillText: { fontSize: 12, fontWeight: '600' },
  intro: { gap: 8, marginTop: 4 },
  introCopy: { fontSize: 15, lineHeight: 22, maxWidth: 330 },
  focusCard: { padding: 19, borderRadius: 25, gap: 22 },
  focusCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  focusEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, opacity: 0.78, marginBottom: 8 },
  focusTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.35 },
  focusMeta: { fontSize: 12, marginTop: 5, opacity: 0.82 },
  focusPlay: { width: 46, height: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  focusBottom: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  focusProgressTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 6 },
  focusProgressFill: { width: '35%', height: '100%', borderRadius: 6 },
  focusHint: { fontSize: 11, fontWeight: '600' },
  progressBlock: { gap: 11 },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 14, fontWeight: '700' },
  progressCount: { fontSize: 12 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addButton: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 106 },
  timeColumn: { width: 66, paddingTop: 17 },
  taskTime: { fontSize: 11, fontWeight: '600' },
  rail: { width: 19, alignItems: 'center', paddingTop: 20 },
  railDot: { width: 9, height: 9, borderRadius: 5, zIndex: 1 },
  railLine: { position: 'absolute', top: 28, bottom: -2, width: 1 },
  nowDot: { width: 9, height: 9, borderRadius: 5, zIndex: 1 },
  nowLine: { position: 'absolute', top: 28, bottom: -2, width: 2 },
  nowLabelWrap: { flex: 1, justifyContent: 'center', paddingBottom: 8 },
  nowLabel: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  nowLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  taskCard: { flex: 1, minHeight: 92, marginBottom: 12, padding: 13, borderWidth: 1, borderRadius: 19, gap: 10 },
  taskTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  durationText: { fontSize: 11, fontWeight: '500' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  taskTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  completedTask: { textDecorationLine: 'line-through', opacity: 0.62 },
  emptyCard: { alignItems: 'flex-start', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
});
