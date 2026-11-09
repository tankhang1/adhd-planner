import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow, useVisualMode, formatMinutes, toDateKey, fromDateKey, todayKey, leaveTimes } from '@/context/DayflowContext';
import { useCalendarEvents } from '@/services/calendar';
import { formatDate, formatDuration, tr as t, useT } from '@/i18n';
import { EnergyCheckIn } from '@/components/EnergyCheckIn';
import { BuddyDialog, DialogButton } from '@/components/BuddyDialog';
import { CloudBuddy } from '@/components/CloudBuddy';
import { Celebration } from '@/components/Celebration';
import { WeeklyReview } from '@/components/WeeklyReview';
import { weekToReview } from '@/services/weekly';
import { collectNudges } from '@/services/nudges';
import type { CalendarEvent } from '@/services/calendar';
import type { DayTask } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { ActivityIcon } from '@/components/ActivityIcon';

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

function WeekStrip({ today, selected, onSelect, busy }: { today: Date; selected: string; onSelect: (key: string) => void; busy: Set<string> }) {
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
        const key = toDateKey(d);
        const isSel = key === selected;
        const isToday = d.toDateString() === today.toDateString();
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            accessibilityLabel={d.toDateString()}
            onPress={() => onSelect(key)}
            testID={`week-day-${i}`}
            style={[styles.weekDay, { backgroundColor: isSel ? colors.primary : 'transparent' }]}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.weekDow, { color: isSel ? colors.primaryForeground : colors.mutedForeground }]}>
              {formatDate(d, { weekday: 'narrow' })}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.weekNum, { color: isSel ? colors.primaryForeground : colors.foreground }]}>
              {d.getDate()}
            </Text>
            <View
              style={[
                styles.weekDot,
                {
                  backgroundColor: isToday
                    ? isSel ? colors.primaryForeground : colors.accent
                    : busy.has(key) ? (isSel ? colors.primaryForeground : colors.border) : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------- Day left bar ------------------------------- */

/** "About 4h left before bed" — makes the rest of the day something you can see. */
function DayLeft({ now }: { now: number }) {
  const colors = useColors();
  const { profile } = useDayflow();
  const wake = profile?.wake ?? 7 * 60 + 30;
  const sleep = profile?.sleep ?? 23 * 60;
  const end = sleep > wake ? sleep : sleep + 24 * 60; // bedtime after midnight
  const at = now < wake && end > 24 * 60 ? now + 24 * 60 : now;
  if (at < wake) return null;

  const left = Math.max(0, Math.round(end - at));
  const progress = Math.min(1, (at - wake) / (end - wake));
  const label =
    left === 0
      ? t('today.dayLeftPast')
      : left < 60
        ? t('today.dayLeftMinutes', { count: left })
        : t('today.dayLeftHours', { time: formatDuration(Math.floor(left / 60) * 60 + (left % 60 >= 15 ? Math.round((left % 60) / 15) * 15 : 0)) });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={styles.dayLeft}
    >
      <View style={styles.dayLeftRow}>
        <Feather name={left === 0 ? 'moon' : 'sun'} size={13} color={colors.mutedForeground} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.dayLeftText, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={[styles.dayLeftTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.dayLeftFill, { width: `${Math.max(2, progress * 100)}%`, backgroundColor: colors.accent }]} />
        <Feather name="moon" size={10} color={colors.mutedForeground} style={styles.dayLeftMoon} />
      </View>
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
  const quiet = useVisualMode() === 'focused';
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
          <Text style={[styles.nowEyebrow, { color: colors.sageInk }]}>{t('today.allClear')}</Text>
          <Text style={[styles.nowTitle, { color: colors.foreground }]}>{t('today.nothingElse')}</Text>
          <Text style={[styles.nowMeta, { color: colors.mutedForeground }]}>{t('today.enjoyFree')}</Text>
        </View>
      </View>
    );
  }

  const ink = inkFor(colors, task.tone);
  const isNow = !!current;
  const trip = !isNow ? leaveTimes(task) : null;
  const getReady = !!trip && now >= trip.getReady && now < task.start;
  const leaveIn = trip ? Math.ceil(trip.leave - now) : 0;
  const remaining = isNow ? Math.ceil(task.start + task.duration - now) : Math.ceil(task.start - now);
  const progress = isNow ? (now - task.start) / task.duration : 0;
  const remainingLabel =
    formatDuration(remaining);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('today.nowA11y', { state: isNow ? t('today.nowState') : t('today.upNextState'), title: task.title })}
      onPress={() => router.push({ pathname: '/focus', params: { taskId: task.id } })}
      testID="now-card"
      style={({ pressed }) => [
        styles.nowCard,
        quiet
          ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }
          : { backgroundColor: colors[task.tone], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.nowRing}>
        <Ring progress={progress} color={ink} track={quiet ? colors.muted : 'rgba(255,255,255,0.7)'} />
        <View style={styles.nowRingIcon}>
          <ActivityIcon name={task.icon} size={26} color={ink} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.nowEyebrow, { color: ink }]}>{isNow ? t('today.rightNow') : getReady ? t('today.getReady') : t('today.upNext')}</Text>
        <Text style={[styles.nowTitle, { color: colors.foreground }]} numberOfLines={2}>
          {task.title}
        </Text>
        <Text style={[styles.nowMeta, { color: colors.mutedForeground }]}>
          {isNow
            ? t('today.timeLeft', { time: remainingLabel })
            : getReady
              ? leaveIn > 0 ? t('today.leaveIn', { count: leaveIn }) : t('today.timeToLeave')
              : trip ? t('today.leaveAt', { time: formatMinutes(trip.leave) }) : t('today.startsIn', { time: remainingLabel })}
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
  const quiet = useVisualMode() === 'focused';
  const height = quiet ? MIN_BLOCK - 8 : Math.max(MIN_BLOCK, task.duration * PX_PER_MIN);
  const active = now >= task.start && now < task.start + task.duration;
  const past = now >= task.start + task.duration;
  const fill = active ? (now - task.start) / task.duration : 0;

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.timeText, { color: active ? ink : colors.mutedForeground }]}>
          {formatMinutes(task.start)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('today.blockA11y', { title: task.title, time: formatMinutes(task.start), count: task.duration })}
        accessibilityHint={t('today.blockHint')}
        onPress={() => router.push({ pathname: '/focus', params: { taskId: task.id } })}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: '/add-task', params: { id: task.id } });
        }}
        delayLongPress={350}
        testID={`task-${task.id}`}
        style={({ pressed }) => [
          styles.block,
          {
            minHeight: height,
            backgroundColor: quiet ? colors.card : colors[task.tone],
            opacity: pressed ? 0.85 : task.done || past ? 0.6 : 1,
            borderColor: active ? ink : quiet ? colors.border : 'transparent',
            borderWidth: quiet && !active ? 1 : 2,
          },
        ]}
      >
        {quiet ? <View style={[styles.quietStripe, { backgroundColor: ink }]} /> : null}
        <View style={[styles.blockIcon, { backgroundColor: quiet ? colors[task.tone] : colors.card }]}>
          <ActivityIcon name={task.icon} size={21} color={ink} />
        </View>
        <View style={styles.blockCopy}>
          <Text
            style={[styles.blockTitle, { color: colors.foreground }, task.done && styles.done]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.rolledOver ? (
            <Text style={[styles.blockMeta, { color: ink, fontWeight: '700' }]}>{t('today.carriedOver')}</Text>
          ) : null}
          {task.travel && !task.done && !active ? (
            <Text style={[styles.blockMeta, { color: ink, fontWeight: '700' }]}>
              <Feather name="navigation" size={11} color={ink} /> {t('today.leaveBy', { time: formatMinutes(task.start - task.travel) })}
            </Text>
          ) : null}
          {active ? (
            <Text style={[styles.blockMeta, { color: ink, fontWeight: '700' }]}>
              {t('today.nowLeft', { count: Math.max(1, Math.ceil(task.start + task.duration - now)) })}
            </Text>
          ) : null}
          <Text style={[styles.blockMeta, { color: colors.mutedForeground }]}>
            {formatMinutes(task.start)} – {formatMinutes(task.start + task.duration)} · {t('common.minutes', { count: task.duration })}
            {task.seriesId ? '  ' : ''}
            {task.seriesId ? <Feather name="repeat" size={11} color={colors.mutedForeground} /> : null}
          </Text>
          {active ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(fill * 100) }}
              style={[styles.blockTrack, { backgroundColor: quiet ? colors.muted : 'rgba(255,255,255,0.75)' }]}
            >
              <View style={[styles.blockProgress, { width: `${Math.max(4, fill * 100)}%`, backgroundColor: ink }]} />
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={`${task.done ? t('today.markIncomplete', { title: task.title }) : t('today.markComplete', { title: task.title })}`}
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

function CalendarBlock({ event }: { event: CalendarEvent }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.timeText, { color: colors.mutedForeground }]}>{formatMinutes(event.start)}</Text>
      </View>
      <View
        accessibilityLabel={t('today.calendarA11y', { title: event.title, time: formatMinutes(event.start) })}
        style={[styles.block, styles.calBlock, { minHeight: Math.max(56, event.duration * PX_PER_MIN * 0.6), borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <View style={[styles.calStripe, { backgroundColor: event.color ?? colors.skyInk }]} />
        <View style={styles.blockCopy}>
          <Text style={[styles.blockTitle, { color: colors.foreground }]} numberOfLines={2}>{event.title}</Text>
          <Text style={[styles.blockMeta, { color: colors.mutedForeground }]}>
            <Feather name="calendar" size={11} /> {formatMinutes(event.start)} – {formatMinutes(event.start + event.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Hyperfocus nudge. When a block runs over: a friendly dialog once,
 * then (if dismissed) just a slim row on Today. Never a big alarm card.
 */
function OverrunNudge({ task, now, allowDialog }: { task: DayTask; now: number; allowDialog: boolean }) {
  const colors = useColors();
  const { extendTask, toggleDayTask, shiftRestOfDay } = useDayflow();
  const [dialogFor, setDialogFor] = useState<string | null>(task.id);
  useEffect(() => setDialogFor(task.id), [task.id]);
  // Wait for any other dialog to finish closing — iOS refuses to present two at once.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!allowDialog) {
      setReady(false);
      return;
    }
    const id = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(id);
  }, [allowDialog]);
  const over = Math.max(1, Math.round(now - (task.start + task.duration)));
  const ink = inkFor(colors, task.tone);

  const extend = () => {
    void Haptics.selectionAsync();
    extendTask(task.id, over + 10, true);
    setDialogFor(null);
  };
  const done = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleDayTask(task.id);
    setDialogFor(null);
  };

  return (
    <>
      <BuddyDialog
        visible={allowDialog && ready && dialogFor === task.id}
        mood="okay"
        title={t('today.overrunTitle', { title: task.title })}
        message={over > 1 ? t('today.overrunMessageOver', { count: over }) : t('today.overrunMessage')}
        onClose={() => setDialogFor(null)}
      >
        <DialogButton label={t('today.overrunExtend')} testID="overrun-extend" onPress={extend} />
        <DialogButton label={t('today.overrunDone')} variant="secondary" testID="overrun-done" onPress={done} />
        <DialogButton
          label={t('today.overrunShift')}
          variant="text"
          testID="overrun-shift"
          onPress={() => {
            shiftRestOfDay(task.date, task.start + task.duration, 15);
            setDialogFor(null);
          }}
        />
      </BuddyDialog>

    </>
  );
}

function SurvivalBanner({ date, parkedCount }: { date: string; parkedCount: number }) {
  const colors = useColors();
  const { endSurvivalDay } = useDayflow();
  return (
    <View style={[styles.slim, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="lifebuoy" size={18} color={colors.roseInk} />
      <Text style={[styles.slimHint, { color: colors.foreground }]} numberOfLines={2}>
        {parkedCount ? t('today.survivalSetAside', { count: parkedCount }) : t('today.survival')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('today.bringBackA11y')}
        onPress={() => endSurvivalDay(date)}
        testID="survival-end"
        style={({ pressed }) => [styles.pill, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[styles.pillText, { color: colors.foreground }]}>{t('today.bringBack')}</Text>
      </Pressable>
    </View>
  );
}

function DaySummary({ tasks, past }: { tasks: DayTask[]; past: boolean }) {
  const colors = useColors();
  const done = tasks.filter((t) => t.done);
  const minutes = done.reduce((sum, t) => sum + t.duration, 0);
  const allDone = tasks.length > 0 && done.length === tasks.length;
  const time = formatDuration(minutes);
  const count = done.length;

  // Copy depends on the moment: a past day, an evening wrap-up, or everything finished.
  const [headline, message] = past
    ? count
      ? [t('today.summaryYouDid', { count }), t('today.summaryShowingUp', { time })]
      : [t('today.summaryQuiet'), t('today.summaryQuietBody')]
    : allDone
      ? [t('today.summaryAllDone'), t('today.summaryAllDoneBody')]
      : count
        ? [t('today.summaryDone', { count }), t('today.summaryEffort', { time })]
        : [t('today.summaryNone'), t('today.summaryNoneBody')];
  return (
    <View
      style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityRole="summary"
      accessibilityLabel={`${headline}. ${message}`}
    >
      <CloudBuddy mood={done.length ? 'happy' : 'sleepy'} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]} numberOfLines={1}>{headline}</Text>
        <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]} numberOfLines={2}>{message}</Text>
      </View>
    </View>
  );
}

function NowLine({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.nowLineRow} accessibilityLabel={t('today.currentTime', { time: label })}>
      <View style={[styles.nowPill, { backgroundColor: colors.accent }]}>
        <Text maxFontSizeMultiplier={1.3} style={styles.nowPillText}>{label}</Text>
      </View>
      <View style={[styles.nowLine, { backgroundColor: colors.accent }]} />
    </View>
  );
}

function Gap({ minutes }: { minutes: number }) {
  const colors = useColors();
  const { bufferMinutes } = useDayflow();
  if (minutes > 0 && minutes < 30 && bufferMinutes > 0 && minutes <= bufferMinutes + 5) {
    return (
      <View style={styles.gapRow} accessibilityLabel={t('today.toSwitch', { count: minutes })}>
        <View style={styles.timeCol} />
        <View style={[styles.gapLine, { borderColor: colors.border, height: 14 }]} />
        <Feather name="wind" size={11} color={colors.mutedForeground} />
        <Text style={[styles.gapText, { color: colors.mutedForeground }]}>{t('today.toSwitch', { count: minutes })}</Text>
      </View>
    );
  }
  if (minutes < 30) return null;
  const label = t('today.free', { time: formatDuration(minutes) });
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
  useT(); // re-render when the language changes
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const {
    dayTasks, toggleDayTask, tasksFor, selectedDate, setSelectedDate,
    rolledOverCount, dismissRolloverBanner, calendarSyncEnabled,
    awayDays, dismissWelcomeBack, moveRolledOverToInbox,
    isSurvivalDay, energyFor,
  } = useDayflow();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = minutesNow(clock);
  const isToday = selectedDate === todayKey();
  const [checkInKey, setCheckInKey] = useState(0);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  // Most recent block that ended in the last 45 min without being ticked off.
  const overrunCandidate = isToday
    ? [...tasksFor(selectedDate)]
        .filter((t) => !t.done && t.start + t.duration <= now && now - (t.start + t.duration) < 45)
        .sort((a, b) => b.start + b.duration - (a.start + a.duration))[0]
    : undefined;
  const overrun = overrunCandidate;
  const nudgeCount = isToday ? collectNudges(dayTasks, selectedDate, now, isSurvivalDay(selectedDate)).length : 0;
  // Tier 1 nudge: a single soft haptic the moment a block runs over (while the app is open).
  const nudgedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!overrun || nudgedRef.current === overrun.id) return;
    nudgedRef.current = overrun.id;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [overrun?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const showWelcome = isToday && !welcomeClosed && (awayDays >= 2 || rolledOverCount > 0);
  const { lastReviewWeek } = useDayflow();
  const [weeklyClosed, setWeeklyClosed] = useState(false);
  const reviewWeek = isToday ? weekToReview(clock, lastReviewWeek) : null;
  const showWeekly = !!reviewWeek && !weeklyClosed && !showWelcome;

  // Small celebration on tick-off. Varied, kind lines; never a streak.
  const [celebration, setCelebration] = useState<string | null>(null);
  const celebrate = () => {
    const doneToday = sorted.filter((t) => t.done).length + 1;
    const lines = [1, 2, 3, 4, 5].map((i) => t(`today.celebrate${i}`));
    const msg = doneToday >= 3 && doneToday % 3 === 0 ? t('today.celebrateCount', { count: doneToday }) : lines[Math.floor(Math.random() * lines.length)];
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebration(msg);
  };

  const closeWelcome = () => {
    setWelcomeClosed(true);
    dismissWelcomeBack();
    dismissRolloverBanner();
  };
  const sorted = tasksFor(selectedDate);
  const events = useCalendarEvents(selectedDate, calendarSyncEnabled);
  const timedEvents = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const busy = useMemo(() => new Set(dayTasks.map((t) => t.date)), [dayTasks]);
  const completed = sorted.filter((t) => t.done).length;
  type Item = { kind: 'task'; task: (typeof sorted)[number] } | { kind: 'event'; event: CalendarEvent };
  const items: Item[] = [
    ...sorted.map((task) => ({ kind: 'task' as const, task })),
    ...timedEvents.map((event) => ({ kind: 'event' as const, event })),
  ].sort((a, b) => (a.kind === 'task' ? a.task.start : a.event.start) - (b.kind === 'task' ? b.task.start : b.event.start));
  const startOf = (it: Item) => (it.kind === 'task' ? it.task.start : it.event.start);
  const endOf = (it: Item) => startOf(it) + (it.kind === 'task' ? it.task.duration : it.event.duration);
  const nowIndex = isToday ? items.findIndex((it) => startOf(it) > now) : -2;
  const hour = clock.getHours();
  const greeting = hour < 12 ? t('today.greetingMorning') : hour < 18 ? t('today.greetingAfternoon') : t('today.greetingEvening');
  const nowLabel = formatMinutes(clock.getHours() * 60 + clock.getMinutes());

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
          <View style={styles.headerTop}>
            <Text style={[styles.date, { color: colors.mutedForeground }]} numberOfLines={1}>
              {formatDate(fromDateKey(selectedDate), { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <View style={styles.headerIcons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={nudgeCount ? `${t('nudges.open')}. ${t('nudges.badge', { count: nudgeCount })}` : t('nudges.open')}
                onPress={() => router.push('/nudges')}
                hitSlop={8}
                testID="open-nudges"
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="bell" size={17} color={colors.foreground} />
                {nudgeCount ? <View style={[styles.badgeDot, { backgroundColor: colors.accent, borderColor: colors.card }]} /> : null}
              </Pressable>
              {isToday ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={energyFor(selectedDate) ? t('today.energyA11y', { level: energyFor(selectedDate) }) : t('today.energyA11yEmpty')}
                  onPress={() => setCheckInKey((k) => k + 1)}
                  hitSlop={8}
                  testID="open-checkin"
                  style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialCommunityIcons
                    name={
                      energyFor(selectedDate) === 'low' ? 'battery-low'
                      : energyFor(selectedDate) === 'okay' ? 'battery-50'
                      : energyFor(selectedDate) === 'high' ? 'battery-high'
                      : 'battery-unknown'
                    }
                    size={18}
                    color={colors.foreground}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
          <Text
            style={[styles.greeting, { color: colors.foreground }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {isToday ? greeting : fromDateKey(selectedDate) < clock ? t('today.lookingBack') : t('today.planningAhead')}
          </Text>
        </View>

        <WeekStrip today={clock} selected={selectedDate} onSelect={setSelectedDate} busy={busy} />

        {isToday ? <DayLeft now={now} /> : null}

        {isToday && isSurvivalDay(selectedDate) ? (
          <SurvivalBanner date={selectedDate} parkedCount={dayTasks.filter((t) => t.date === selectedDate && t.parked).length} />
        ) : null}

        {overrun ? <OverrunNudge task={overrun} now={now} allowDialog={!showWelcome && !showWeekly && !energyOpen && !celebration} /> : null}

        {isToday ? <NowCard tasks={sorted} now={now} /> : null}

        {isToday ? (
          <View style={styles.helpers}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('today.stuckA11y')}
              onPress={() => router.push({ pathname: '/one-thing', params: { pick: '1' } })}
              testID="pick-for-me"
              style={({ pressed }) => [styles.helper, { backgroundColor: colors.lilac, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.helperIcon, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="dice-5" size={20} color={colors.lilacInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.helperTitle, { color: colors.foreground }]} numberOfLines={1}>{t('today.stuck')}</Text>
                <Text style={[styles.helperSub, { color: colors.mutedForeground }]} numberOfLines={2}>{t('today.stuckSub')}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('today.tooMuchA11y')}
              onPress={() => router.push('/one-thing')}
              testID="one-thing-mode"
              style={({ pressed }) => [styles.helper, { backgroundColor: colors.sky, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.helperIcon, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="eye-outline" size={20} color={colors.skyInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.helperTitle, { color: colors.foreground }]} numberOfLines={1}>{t('today.tooMuch')}</Text>
                <Text style={[styles.helperSub, { color: colors.mutedForeground }]} numberOfLines={2}>{t('today.tooMuchSub')}</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {sorted.length && (selectedDate < todayKey() || (isToday && (hour >= 18 || sorted.every((t) => t.done)))) ? (
          <DaySummary tasks={sorted} past={selectedDate < todayKey()} />
        ) : null}

        {allDay.length ? (
          <View style={styles.allDayRow}>
            {allDay.map((e) => (
              <View key={e.id} style={[styles.allDayChip, { backgroundColor: colors.sky }]}>
                <Feather name="calendar" size={12} color={colors.skyInk} />
                <Text style={[styles.allDayText, { color: colors.foreground }]} numberOfLines={1}>{e.title}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: colors.foreground }]}>{t('today.yourDay')}</Text>
            {sorted.length ? (
              <View style={[styles.progressChip, { backgroundColor: colors.secondary }]} accessibilityLabel={`${completed}/${sorted.length}`}>
                <Feather name="check-circle" size={13} color={colors.secondaryForeground} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.progressChipText, { color: colors.secondaryForeground }]}>
                  {completed}/{sorted.length}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{t('today.tapHint')}</Text>
        </View>

        <View>
          {items.map((it, i) => {
            const prev = items[i - 1];
            const gap = prev ? startOf(it) - endOf(prev) : 0;
            const key = it.kind === 'task' ? it.task.id : it.event.id;
            return (
              <React.Fragment key={key}>
                {i > 0 ? <Gap minutes={gap} /> : null}
                {i === nowIndex ? <NowLine label={nowLabel} /> : null}
                {it.kind === 'task' ? (
                  <TimelineBlock
                    task={it.task}
                    now={isToday ? now : fromDateKey(selectedDate) < clock ? 24 * 60 : -1}
                    onToggle={() => {
                      void Haptics.selectionAsync();
                      if (!it.task.done) celebrate();
                      toggleDayTask(it.task.id);
                    }}
                  />
                ) : (
                  <CalendarBlock event={it.event} />
                )}
              </React.Fragment>
            );
          })}
          {items.length && nowIndex === -1 ? <NowLine label={nowLabel} /> : null}
          {!items.length ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CloudBuddy mood="hello" size={110} />
              <Text style={[styles.section, { color: colors.foreground }]}>{t('today.emptyTitle')}</Text>
              <Text style={{ color: colors.mutedForeground }}>{t('today.emptyBody')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BuddyDialog
        visible={showWelcome}
        mood={awayDays >= 2 ? 'hello' : 'okay'}
        title={awayDays >= 2 ? t('today.welcomeBack') : t('today.freshStart')}
        message={
          (awayDays >= 2 ? t('today.welcomeAway', { count: awayDays + 1 }) : '') +
          (rolledOverCount ? t('today.welcomeMoved', { count: rolledOverCount }) : t('today.welcomeStartSmall'))
        }
        onClose={closeWelcome}
      >
        {rolledOverCount ? (
          <DialogButton
            label={t('today.welcomeToInbox')}
            variant="secondary"
            testID="welcome-to-inbox"
            icon={<Feather name="inbox" size={16} color={colors.foreground} />}
            onPress={() => {
              moveRolledOverToInbox();
              closeWelcome();
            }}
          />
        ) : null}
        <DialogButton label={rolledOverCount ? t('today.welcomeKeep') : t('common.letsGo')} testID="welcome-keep" onPress={closeWelcome} />
      </BuddyDialog>

      {showWeekly && reviewWeek ? <WeeklyReview monday={reviewWeek} onClose={() => setWeeklyClosed(true)} /> : null}

      <EnergyCheckIn
        blocked={showWelcome || showWeekly}
        forceOpen={checkInKey > 0 ? true : undefined}
        key={`checkin-${checkInKey}`}
        onVisibleChange={setEnergyOpen}
      />

      {celebration ? <Celebration message={celebration} onDone={() => setCelebration(null)} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('today.addA11y')}
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
  header: { gap: 2 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionBlock: { gap: 2 },
  date: { flex: 1, fontSize: 14, fontWeight: '600' },
  greeting: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  progressChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  blockTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  blockProgress: { height: '100%', borderRadius: 3 },
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20 },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  allDayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allDayChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, maxWidth: '100%' },
  allDayText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  calBlock: { borderWidth: 1, borderStyle: 'dashed', paddingLeft: 18 },
  calStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  quietStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 8, paddingRight: 14, borderRadius: 20, borderWidth: 1 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  summaryMeta: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  summaryIcons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  overrun: { padding: 16, borderRadius: 24, gap: 14, borderWidth: 2 },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52, borderRadius: 18, borderWidth: 1 },
  slimCol: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1 },
  slimHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slimTitle: { fontSize: 14, fontWeight: '700' },
  slimHint: { flex: 1, fontSize: 14, fontWeight: '600' },
  slimPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 'auto' },
  batteryBtn: { width: 40, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17 },
  pillText: { fontSize: 13, fontWeight: '700' },
  welcome: { padding: 16, borderRadius: 24, gap: 14 },
  welcomeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  welcomeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 44, borderRadius: 22 },
  welcomeBtnText: { fontSize: 14, fontWeight: '700' },
  dayLeft: { gap: 6, marginTop: -6 },
  dayLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayLeftText: { fontSize: 12, fontWeight: '600' },
  dayLeftTrack: { height: 6, borderRadius: 3, overflow: 'visible', justifyContent: 'center' },
  dayLeftFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  dayLeftMoon: { position: 'absolute', right: -14 },
  badgeDot: { position: 'absolute', top: 7, right: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  helpers: { flexDirection: 'row', gap: 10, marginTop: -6 },
  helper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20 },
  helperIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  helperTitle: { fontSize: 15, fontWeight: '800' },
  helperSub: { fontSize: 12, lineHeight: 16, marginTop: 1 },
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
