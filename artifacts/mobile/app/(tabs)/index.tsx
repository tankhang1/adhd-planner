import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow, formatMinutes } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

type Colors = ReturnType<typeof useColors>;
const PX_PER_MIN = 1.5;
const MIN_BLOCK = 76;

function inkFor(colors: Colors, tone: DayTask['tone']) {
  return colors[`${tone}Ink` as const];
}

function minutesNow(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/* ------------------------------ Week strip ------------------------------ */

function WeekStrip({ today, selected, onSelect }: { today: Date; selected: number; onSelect: (i: number) => void }) {
  const colors = useColors();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <View style={styles.week}>
      {days.map((d, i) => {
        const isSel = i === selected;
        const isToday = d.toDateString() === today.toDateString();
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            accessibilityLabel={d.toDateString()}
            onPress={() => onSelect(i)}
            testID={`week-day-${i}`}
            style={[styles.weekDay, { backgroundColor: isSel ? colors.primary : 'transparent' }]}
          >
            <Text style={[styles.weekDow, { color: isSel ? colors.primaryForeground : colors.mutedForeground }]}>
              {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
            </Text>
            <Text style={[styles.weekNum, { color: isSel ? colors.primaryForeground : colors.foreground }]}>
              {d.getDate()}
            </Text>
            <View
              style={[
                styles.weekDot,
                { backgroundColor: isToday ? (isSel ? colors.primaryForeground : colors.accent) : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------ Now card -------------------------------- */

function Ring({ progress, color, track, size = 64 }: { progress: number; color: string; track: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c}`}
        strokeDashoffset={`${c * (1 - Math.max(0, Math.min(progress, 1)))}`}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
        fill="none"
      />
    </Svg>
  );
}

function NowCard({ tasks, now }: { tasks: DayTask[]; now: number }) {
  const colors = useColors();
  const current = tasks.find((t) => now >= t.start && now < t.start + t.duration);
  const next = tasks.find((t) => t.start > now && !t.done);
  const task = current ?? next;

  if (!task) {
    return (
      <View style={[styles.nowCard, { backgroundColor: colors.sage }]}>
        <View style={[styles.nowIcon, { backgroundColor: colors.card }]}>
          <Feather name="check" size={22} color={colors.sageInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nowEyebrow, { color: colors.sageInk }]}>ALL CLEAR</Text>
          <Text style={[styles.nowTitle, { color: colors.foreground }]}>Nothing else planned</Text>
          <Text style={[styles.nowMeta, { color: colors.mutedForeground }]}>Enjoy the free time.</Text>
        </View>
      </View>
    );
  }

  const ink = inkFor(colors, task.tone);
  const isNow = !!current;
  const remaining = isNow ? Math.ceil(task.start + task.duration - now) : Math.ceil(task.start - now);
  const progress = isNow ? (now - task.start) / task.duration : 0;
  const remainingLabel =
    remaining >= 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining} min`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNow ? 'Now' : 'Up next'}: ${task.title}. Open focus timer.`}
      onPress={() => router.push({ pathname: '/focus', params: { taskId: task.id } })}
      testID="now-card"
      style={({ pressed }) => [styles.nowCard, { backgroundColor: colors[task.tone], opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.nowRing}>
        <Ring progress={progress} color={ink} track="rgba(255,255,255,0.7)" />
        <View style={styles.nowRingIcon}>
          <Feather name={task.icon} size={22} color={ink} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.nowEyebrow, { color: ink }]}>{isNow ? 'RIGHT NOW' : 'UP NEXT'}</Text>
        <Text style={[styles.nowTitle, { color: colors.foreground }]} numberOfLines={2}>
          {task.title}
        </Text>
        <Text style={[styles.nowMeta, { color: colors.mutedForeground }]}>
          {isNow ? `${remainingLabel} left` : `Starts in ${remainingLabel}`}
        </Text>
      </View>
      <View style={[styles.nowPlay, { backgroundColor: ink }]}>
        <Feather name="play" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

/* ------------------------------ Timeline -------------------------------- */

function TimelineBlock({ task, now, onToggle }: { task: DayTask; now: number; onToggle: () => void }) {
  const colors = useColors();
  const ink = inkFor(colors, task.tone);
  const height = Math.max(MIN_BLOCK, task.duration * PX_PER_MIN);
  const active = now >= task.start && now < task.start + task.duration;
  const past = now >= task.start + task.duration;
  const fill = active ? (now - task.start) / task.duration : 0;

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, { color: active ? ink : colors.mutedForeground }]}>
          {formatMinutes(task.start)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${formatMinutes(task.start)}, ${task.duration} minutes. Open focus timer.`}
        onPress={() => router.push({ pathname: '/focus', params: { taskId: task.id } })}
        testID={`task-${task.id}`}
        style={({ pressed }) => [
          styles.block,
          {
            minHeight: height,
            backgroundColor: colors[task.tone],
            opacity: pressed ? 0.85 : task.done || past ? 0.6 : 1,
            borderColor: active ? ink : 'transparent',
          },
        ]}
      >
        {active ? (
          <View style={[styles.blockFill, { height: `${fill * 100}%`, backgroundColor: ink }]} />
        ) : null}
        <View style={[styles.blockIcon, { backgroundColor: colors.card }]}>
          <Feather name={task.icon} size={18} color={ink} />
        </View>
        <View style={styles.blockCopy}>
          <Text
            style={[styles.blockTitle, { color: colors.foreground }, task.done && styles.done]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <Text style={[styles.blockMeta, { color: colors.mutedForeground }]}>
            {formatMinutes(task.start)} – {formatMinutes(task.start + task.duration)} · {task.duration} min
          </Text>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
          hitSlop={12}
          onPress={onToggle}
          testID={`toggle-${task.id}`}
          style={[
            styles.check,
            { borderColor: ink, backgroundColor: task.done ? ink : colors.card },
          ]}
        >
          {task.done ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
        </Pressable>
      </Pressable>
    </View>
  );
}

function NowLine({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.nowLineRow} accessibilityLabel={`Current time ${label}`}>
      <View style={[styles.nowPill, { backgroundColor: colors.accent }]}>
        <Text style={styles.nowPillText}>{label}</Text>
      </View>
      <View style={[styles.nowLine, { backgroundColor: colors.accent }]} />
    </View>
  );
}

function Gap({ minutes }: { minutes: number }) {
  const colors = useColors();
  if (minutes < 30) return null;
  const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m ` : ''}free` : `${minutes}m free`;
  return (
    <View style={styles.gapRow}>
      <View style={styles.timeCol} />
      <View style={[styles.gapLine, { borderColor: colors.border }]} />
      <Text style={[styles.gapText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------- Screen --------------------------------- */

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const { dayTasks, toggleDayTask } = useDayflow();
  const [clock, setClock] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = minutesNow(clock);
  const sorted = useMemo(() => [...dayTasks].sort((a, b) => a.start - b.start), [dayTasks]);
  const completed = dayTasks.filter((t) => t.done).length;
  const nowIndex = sorted.findIndex((t) => t.start > now);
  const hour = clock.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const nowLabel = clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: web ? 60 : Math.max(insets.top, 16) + 4,
            paddingBottom: web ? 140 : insets.bottom + 150,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>{greeting}</Text>
          </View>
          <View style={[styles.progressChip, { backgroundColor: colors.secondary }]}>
            <Feather name="check-circle" size={14} color={colors.secondaryForeground} />
            <Text style={[styles.progressChipText, { color: colors.secondaryForeground }]}>
              {completed}/{dayTasks.length}
            </Text>
          </View>
        </View>

        <WeekStrip today={clock} selected={selectedDay} onSelect={setSelectedDay} />

        <NowCard tasks={sorted} now={now} />

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: colors.foreground }]}>Your day</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Tap a block to focus</Text>
        </View>

        <View>
          {sorted.map((task, i) => {
            const prev = sorted[i - 1];
            const gap = prev ? task.start - (prev.start + prev.duration) : 0;
            return (
              <React.Fragment key={task.id}>
                {i > 0 ? <Gap minutes={gap} /> : null}
                {i === nowIndex ? <NowLine label={nowLabel} /> : null}
                <TimelineBlock
                  task={task}
                  now={now}
                  onToggle={() => {
                    void Haptics.selectionAsync();
                    toggleDayTask(task.id);
                  }}
                />
              </React.Fragment>
            );
          })}
          {sorted.length && nowIndex === -1 ? <NowLine label={nowLabel} /> : null}
          {!sorted.length ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={26} color={colors.primary} />
              <Text style={[styles.section, { color: colors.foreground }]}>An open day</Text>
              <Text style={{ color: colors.mutedForeground }}>Tap + to add your first activity.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an activity"
        onPress={() => router.push('/add-task')}
        testID="add-task"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: (web ? 84 : 62 + insets.bottom) + 18,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  date: { fontSize: 13, fontWeight: '600' },
  greeting: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  progressChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  progressChipText: { fontSize: 13, fontWeight: '700' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { width: 44, paddingVertical: 9, borderRadius: 16, alignItems: 'center', gap: 4 },
  weekDow: { fontSize: 12, fontWeight: '600' },
  weekNum: { fontSize: 17, fontWeight: '700' },
  weekDot: { width: 5, height: 5, borderRadius: 3 },
  nowCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 26 },
  nowRing: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  nowRingIcon: { position: 'absolute' },
  nowIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nowEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  nowTitle: { fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3 },
  nowMeta: { fontSize: 13, fontWeight: '500' },
  nowPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionHint: { fontSize: 12, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timeCol: { width: 62, paddingTop: 14 },
  timeText: { fontSize: 12, fontWeight: '700' },
  block: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
  },
  blockFill: { position: 'absolute', left: 0, top: 0, width: 5, borderRadius: 3 },
  blockIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  blockCopy: { flex: 1, gap: 3, paddingTop: 1 },
  blockTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  blockMeta: { fontSize: 12, fontWeight: '500' },
  done: { textDecorationLine: 'line-through' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  nowLineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nowPill: { width: 62, paddingVertical: 4, borderRadius: 999, alignItems: 'center' },
  nowPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  nowLine: { flex: 1, height: 2, borderRadius: 1, marginLeft: 10 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, minHeight: 22 },
  gapLine: { width: 0, height: 22, borderLeftWidth: 2, borderStyle: 'dashed', marginLeft: 18 },
  gapText: { fontSize: 12, fontWeight: '500' },
  empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 24, borderWidth: 1 },
  fab: {
    position: 'absolute',
    right: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
