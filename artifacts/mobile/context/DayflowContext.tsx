import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/* --------------------------------- Types --------------------------------- */

export type TaskTone = 'sage' | 'apricot' | 'sky' | 'lilac' | 'rose' | 'lemon';
export const TASK_TONES: TaskTone[] = ['lilac', 'sky', 'sage', 'apricot', 'rose', 'lemon'];
/**
 * Activity icons (MaterialCommunityIcons), grouped around everyday ADHD
 * pain points: meds & body care, food, sleep, focus work, chores, people.
 */
export const ICON_GROUPS = [
  { label: 'Body & care', icons: ['pill', 'cup-water', 'shower-head', 'toothbrush', 'tshirt-crew', 'bed'] },
  { label: 'Food', icons: ['food-apple', 'silverware-fork-knife', 'coffee'] },
  { label: 'Move & rest', icons: ['walk', 'run', 'yoga', 'meditation', 'sofa', 'weather-sunny', 'weather-night'] },
  { label: 'Focus', icons: ['briefcase', 'laptop', 'book-open-variant', 'school', 'pencil', 'brain', 'target', 'timer-sand'] },
  { label: 'Home & errands', icons: ['broom', 'washing-machine', 'trash-can', 'cart', 'cash', 'car', 'home', 'dog'] },
  { label: 'People & fun', icons: ['email', 'phone', 'account-group', 'calendar-check', 'music', 'gamepad-variant', 'palette', 'heart', 'emoticon-happy', 'star'] },
] as const;
export const TASK_ICONS = ICON_GROUPS.flatMap((g) => g.icons);
export type TaskIcon = (typeof ICON_GROUPS)[number]['icons'][number];

/** Old Feather icon names saved by earlier versions → new icons. */
const LEGACY_ICONS: Record<string, TaskIcon> = {
  sun: 'weather-sunny', moon: 'weather-night', coffee: 'coffee', 'book-open': 'book-open-variant',
  briefcase: 'briefcase', mail: 'email', phone: 'phone', 'shopping-cart': 'cart', heart: 'heart',
  activity: 'walk', music: 'music', home: 'home', 'edit-3': 'pencil', monitor: 'laptop',
  smile: 'emoticon-happy', star: 'star',
};
export function toTaskIcon(value: unknown, fallback: TaskIcon = 'star'): TaskIcon {
  if (typeof value !== 'string') return fallback;
  if ((TASK_ICONS as readonly string[]).includes(value)) return value as TaskIcon;
  return LEGACY_ICONS[value] ?? fallback;
}
export type VisualMode = 'playful' | 'focused';
export type Struggle = 'starting' | 'time' | 'hyperfocus' | 'overwhelm';

export interface DayTask {
  id: string;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Start time, minutes since midnight */
  start: number;
  duration: number;
  title: string;
  tone: TaskTone;
  icon: TaskIcon;
  done: boolean;
  label: string;
  /** Moved forward automatically from an earlier day */
  rolledOver?: boolean;
  /** Kept even on survival days (meds, food, sleep…) */
  essential?: boolean;
  /** Parked because of a survival day; restorable */
  parked?: boolean;
  /** Minutes to travel there (0/undefined = no trip) */
  travel?: number;
  /** Minutes to get ready before leaving */
  prep?: number;
  /** Set when this task is an instance of a repeating series */
  seriesId?: string;
}

/** A repeating task template. `days` uses JS weekday numbers (0 = Sunday). */
export interface RecurringTask {
  id: string;
  title: string;
  start: number;
  duration: number;
  tone: TaskTone;
  icon: TaskIcon;
  days: number[];
  /** First date (YYYY-MM-DD) the series applies to */
  from: string;
  /** Dates where a single instance was removed */
  skip: string[];
  essential?: boolean;
}

export type TaskDraft = Pick<DayTask, 'title' | 'start' | 'duration' | 'tone' | 'icon'> & {
  date?: string;
  essential?: boolean;
  travel?: number;
  prep?: number;
  label?: string;
  /** Weekdays to repeat on (0 = Sunday). Empty/undefined = one-off. */
  repeatDays?: number[];
};

export type EditScope = 'one' | 'series';

export const REPEAT_PRESETS: Array<{ key: string; label: string; days: number[] }> = [
  { key: 'once', label: 'Once', days: [] },
  { key: 'daily', label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { key: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { key: 'weekends', label: 'Weekends', days: [0, 6] },
];

export const REMINDER_LEADS = [5, 10, 15] as const;
export const BUFFER_OPTIONS = [0, 5, 10, 15] as const;

export type EnergyLevel = 'low' | 'okay' | 'high';
export interface EnergyEntry {
  date: string;
  level: EnergyLevel;
  /** The follow-up suggestion was acted on or dismissed — don't show it again */
  handled?: boolean;
}
/** Tasks labelled/iconed like this are kept on survival days. */
export const ESSENTIAL_ICONS: TaskIcon[] = [
  'pill', 'cup-water', 'food-apple', 'silverware-fork-knife', 'bed', 'shower-head', 'toothbrush',
];
export type BufferMinutes = (typeof BUFFER_OPTIONS)[number];

export { timeKey, insightFor, overallTendency } from '@/services/timeLearning';
export type { TimeLogEntry, TimeInsight } from '@/services/timeLearning';
import { timeKey } from '@/services/timeLearning';
import type { TimeLogEntry } from '@/services/timeLearning';
export type ReminderLead = (typeof REMINDER_LEADS)[number];

export interface InboxTask {
  id: string;
  title: string;
  done: boolean;
}

export interface RoutineStep {
  id: string;
  title: string;
  duration: number;
  done: boolean;
}

export interface Routine {
  id: string;
  title: string;
  subtitle: string;
  tone: TaskTone;
  icon: TaskIcon;
  steps: RoutineStep[];
}

export type RoutineDraft = Omit<Routine, 'id' | 'steps'> & {
  steps: Array<Pick<RoutineStep, 'title' | 'duration'> & { id?: string }>;
};

export interface Profile {
  wake: number;
  sleep: number;
  struggle: Struggle;
}

interface DayflowState {
  dayTasks: DayTask[];
  inboxTasks: InboxTask[];
  routines: Routine[];
  visualMode: VisualMode;
  activeRoutineId: string | null;
  onboarded: boolean;
  profile: Profile | null;
  remindersEnabled: boolean;
  calendarSyncEnabled: boolean;
  liveActivityEnabled: boolean;
  /** Count of tasks moved forward at last open, for the gentle banner */
  rolledOverCount: number;
  recurring: RecurringTask[];
  reminderLead: ReminderLead;
  /** Quiet hours, minutes since midnight. null = off. */
  quietStart: number | null;
  quietEnd: number | null;
  /** Last day the app was opened, for the "welcome back" moment */
  lastOpenDate: string | null;
  /** Days since last open, computed at launch (0 = opened yesterday/today) */
  awayDays: number;
  /** Breathing room kept between blocks when adding or shifting */
  bufferMinutes: BufferMinutes;
  timeLog: TimeLogEntry[];
  energyLog: EnergyEntry[];
  /** Dates (YYYY-MM-DD) running in survival mode */
  survivalDays: string[];
  /** Last date the morning check-in auto-opened (so it shows once a day) */
  energyPromptDate: string | null;
}

interface DayflowContextValue extends DayflowState {
  hydrated: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  tasksFor: (date: string) => DayTask[];
  addDayTask: (task: TaskDraft) => void;
  updateDayTask: (id: string, patch: Partial<TaskDraft>, scope?: EditScope) => void;
  removeDayTask: (id: string, scope?: EditScope) => void;
  seriesFor: (task: DayTask) => RecurringTask | undefined;
  moveRolledOverToInbox: () => void;
  dismissWelcomeBack: () => void;
  setReminderLead: (lead: ReminderLead) => void;
  setQuietHours: (start: number | null, end: number | null) => void;
  /** Make a task longer; optionally push everything after it later by the same amount. */
  extendTask: (id: string, minutes: number, shiftRest?: boolean) => void;
  /** Move every unfinished task starting at/after `fromMinute` on `date` later. */
  shiftRestOfDay: (date: string, fromMinute: number, minutes: number) => void;
  setBufferMinutes: (m: BufferMinutes) => void;
  /** Suggested start for a new task on `date`: right after the last block + buffer. */
  nextFreeStart: (date: string, notBefore: number) => number;
  logTime: (task: DayTask, actualMinutes: number) => void;
  energyFor: (date: string) => EnergyLevel | undefined;
  setEnergy: (date: string, level: EnergyLevel) => void;
  energyHandled: (date: string) => boolean;
  markEnergyPrompted: (date: string) => void;
  markEnergyHandled: (date: string) => void;
  isSurvivalDay: (date: string) => boolean;
  /** Keep only essentials on `date`; everything else is parked (not deleted). */
  startSurvivalDay: (date: string) => void;
  endSurvivalDay: (date: string) => void;
  /** Push non-essential, unfinished tasks on `date` to tomorrow. Returns how many moved. */
  lightenDay: (date: string, keep: number) => void;
  toggleDayTask: (id: string) => void;
  addInboxTask: (title: string) => void;
  toggleInboxTask: (id: string) => void;
  removeInboxTask: (id: string) => void;
  scheduleInboxTask: (id: string, start: number, date?: string) => void;
  toggleRoutineStep: (routineId: string, stepId: string) => void;
  setRoutineStepDone: (routineId: string, stepId: string, done: boolean) => void;
  resetRoutine: (routineId: string) => void;
  saveRoutine: (draft: RoutineDraft, id?: string) => void;
  removeRoutine: (id: string) => void;
  setVisualMode: (mode: VisualMode) => void;
  setActiveRoutineId: (id: string | null) => void;
  completeOnboarding: (profile: Profile) => void;
  resetOnboarding: () => void;
  setRemindersEnabled: (on: boolean) => void;
  setCalendarSyncEnabled: (on: boolean) => void;
  setLiveActivityEnabled: (on: boolean) => void;
  dismissRolloverBanner: () => void;
}

/* -------------------------------- Helpers -------------------------------- */

export function formatMinutes(total: number) {
  if (!Number.isFinite(total)) return '--:--';
  total = Math.round(total);
  const h = Math.floor(total / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey() {
  return toDateKey(new Date());
}

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function parseLegacyTime(value: unknown): number {
  if (typeof value !== 'string') return 9 * 60;
  const m = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 9 * 60;
  let h = Number(m[1]);
  if (m[3]) {
    h %= 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
  }
  return h * 60 + Number(m[2]);
}

function normalizeDayTasks(tasks: unknown, fallbackDate: string): DayTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((raw) => {
    const t = raw as Partial<DayTask> & { time?: string };
    return {
      id: t.id ?? uid('day'),
      date: typeof t.date === 'string' ? t.date : fallbackDate,
      title: t.title ?? 'Untitled',
      start: Number.isFinite(t.start) ? (t.start as number) : parseLegacyTime(t.time),
      duration: Number.isFinite(t.duration) ? (t.duration as number) : 25,
      tone: TASK_TONES.includes(t.tone as TaskTone) ? (t.tone as TaskTone) : 'lilac',
      icon: toTaskIcon(t.icon),
      done: !!t.done,
      label: t.label ?? 'Activity',
      rolledOver: !!t.rolledOver,
      essential: !!t.essential,
      parked: !!t.parked,
      ...(Number.isFinite(t.travel) && (t.travel as number) > 0 ? { travel: t.travel, prep: Number.isFinite(t.prep) ? t.prep : 10 } : {}),
      ...(typeof t.seriesId === 'string' ? { seriesId: t.seriesId } : {}),
    };
  });
}

function normalizeRoutines(list: unknown): Routine[] | null {
  if (!Array.isArray(list)) return null;
  return list.map((raw) => {
    const r = raw as Partial<Routine>;
    return {
      id: r.id ?? uid('routine'),
      title: r.title ?? 'Routine',
      subtitle: r.subtitle ?? '',
      tone: TASK_TONES.includes(r.tone as TaskTone) ? (r.tone as TaskTone) : 'lilac',
      icon: toTaskIcon(r.icon, r.id === 'evening' ? 'weather-night' : 'weather-sunny'),
      steps: Array.isArray(r.steps) ? r.steps : [],
    };
  });
}

/**
 * Unfinished tasks from past days move to today — no "overdue", no red.
 * Returns the updated list and how many moved.
 */
const HISTORY_DAYS = 90;

function daysBetween(a: string, b: string) {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
}

function rollOver(tasks: DayTask[], today: string): [DayTask[], number] {
  let moved = 0;
  const next = tasks
    // keep finished tasks as gentle history, but only for a while
    .filter((t) => !(t.date < today && t.done && daysBetween(t.date, today) > HISTORY_DAYS))
    // a missed repeat instance doesn't follow you — tomorrow brings a fresh one
    .filter((t) => !(t.date < today && !t.done && t.seriesId))
    .map((t) => (t.parked && t.date < today ? { ...t, parked: false } : t))
    .map((t) => {
      if (t.date < today && !t.done) {
        moved += 1;
        return { ...t, date: today, rolledOver: true };
      }
      return t;
    });
  return [next, moved];
}

/** Minute of the day to leave the house, and to start getting ready. */
export function leaveTimes(t: Pick<DayTask, 'start' | 'travel' | 'prep'>) {
  if (!t.travel) return null;
  const leave = t.start - t.travel;
  return { leave, getReady: leave - (t.prep ?? 0) };
}

export function isEssential(t: Pick<DayTask, 'essential' | 'icon'>) {
  return !!t.essential || ESSENTIAL_ICONS.includes(t.icon);
}

/** Create missing instances of repeating tasks for the given dates. */
function materialize(tasks: DayTask[], recurring: RecurringTask[], dates: string[]): DayTask[] {
  const additions: DayTask[] = [];
  for (const date of dates) {
    const weekday = fromDateKey(date).getDay();
    for (const r of recurring) {
      if (date < r.from || !r.days.includes(weekday) || r.skip.includes(date)) continue;
      if (tasks.some((t) => t.seriesId === r.id && t.date === date)) continue;
      additions.push({
        id: `${r.id}-${date}`,
        seriesId: r.id,
        date,
        title: r.title,
        start: r.start,
        duration: r.duration,
        tone: r.tone,
        icon: r.icon,
        done: false,
        label: 'Repeats',
        ...(r.essential ? { essential: true } : {}),
      });
    }
  }
  return additions.length ? [...tasks, ...additions] : tasks;
}

/** A starter day built from the onboarding answers. */
export function buildStarterDay(profile: Profile, date: string): DayTask[] {
  const { wake, sleep, struggle } = profile;
  const mk = (title: string, start: number, duration: number, tone: TaskTone, icon: TaskIcon, label: string): DayTask => ({
    id: uid('day'), date, title, start, duration, tone, icon, label, done: false,
  });
  const focusLen = struggle === 'hyperfocus' ? 45 : struggle === 'starting' ? 15 : 30;
  const focusTitle =
    struggle === 'starting' ? 'Start with a tiny step' : struggle === 'overwhelm' ? 'Pick just one thing' : 'Focus block';
  return [
    mk('Wake up gently', wake, 15, 'lemon', 'weather-sunny', 'Routine'),
    mk('Meds & a glass of water', wake + 15, 5, 'sky', 'pill', 'Self-care'),
    mk('Breakfast', wake + 30, 30, 'apricot', 'food-apple', 'Self-care'),
    mk(focusTitle, wake + 90, focusLen, 'lilac', 'target', 'Focus time'),
    mk('Move your body', wake + 90 + focusLen + 15, 15, 'sage', 'walk', 'Reset'),
    mk('Lunch break', Math.max(12 * 60, wake + 240), 45, 'rose', 'silverware-fork-knife', 'Reset'),
    mk(struggle === 'hyperfocus' ? 'Check the clock & stretch' : 'Small admin task', Math.max(14 * 60, wake + 360), 25, 'sky', struggle === 'hyperfocus' ? 'timer-sand' : 'email', 'Small task'),
    mk('Wind down', Math.max(wake + 60, sleep - 45), 30, 'lilac', 'weather-night', 'Routine'),
  ];
}

/* ------------------------------ Initial state ---------------------------- */

export const STORAGE_KEY = 'dayflow-v4';

const initialState: DayflowState = {
  dayTasks: [],
  inboxTasks: [
    { id: 'inbox-1', title: 'Book a dentist appointment', done: false },
    { id: 'inbox-2', title: 'Put laundry away', done: false },
    { id: 'inbox-3', title: 'Send the project update', done: false },
  ],
  routines: [
    {
      id: 'morning',
      title: 'A gentle morning',
      subtitle: 'Start without rushing',
      tone: 'lemon',
      icon: 'weather-sunny',
      steps: [
        { id: 'm-1', title: 'Take meds with a glass of water', duration: 2, done: false },
        { id: 'm-2', title: 'Open the curtains', duration: 2, done: false },
        { id: 'm-3', title: 'Get dressed', duration: 8, done: false },
        { id: 'm-4', title: 'Choose one thing for today', duration: 3, done: false },
      ],
    },
    {
      id: 'evening',
      title: 'An easier evening',
      subtitle: 'Make tomorrow kinder',
      tone: 'lilac',
      icon: 'weather-night',
      steps: [
        { id: 'e-1', title: 'Put tomorrow’s essentials by the door', duration: 4, done: false },
        { id: 'e-2', title: 'Reset one small surface', duration: 5, done: false },
        { id: 'e-3', title: 'Wind down with a book', duration: 10, done: false },
      ],
    },
  ],
  visualMode: 'playful',
  activeRoutineId: null,
  onboarded: false,
  profile: null,
  remindersEnabled: false,
  calendarSyncEnabled: false,
  liveActivityEnabled: true,
  rolledOverCount: 0,
  recurring: [],
  reminderLead: 5,
  quietStart: null,
  quietEnd: null,
  lastOpenDate: null,
  awayDays: 0,
  bufferMinutes: 5,
  timeLog: [],
  energyLog: [],
  survivalDays: [],
  energyPromptDate: null,
};

/* -------------------------------- Provider ------------------------------- */

const DayflowContext = createContext<DayflowContextValue | null>(null);

export function DayflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DayflowState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  // Load + migrate + roll over.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        const today = todayKey();
        const parsed = stored ? (JSON.parse(stored) as Partial<DayflowState>) : {};
        setState((current) => {
          const merged: DayflowState = { ...current, ...parsed, activeRoutineId: null };
          const [tasks, moved] = rollOver(normalizeDayTasks(merged.dayTasks, today), today);
          const recurring = Array.isArray(merged.recurring) ? merged.recurring : [];
          if (!Array.isArray(merged.timeLog)) merged.timeLog = [];
          if (!Array.isArray(merged.energyLog)) merged.energyLog = [];
          if (!Array.isArray(merged.survivalDays)) merged.survivalDays = [];
          const away = merged.lastOpenDate ? Math.max(0, daysBetween(merged.lastOpenDate, today) - 1) : 0;
          return {
            ...merged,
            recurring,
            lastOpenDate: today,
            awayDays: away || merged.awayDays || 0,
            dayTasks: materialize(tasks, recurring, [today]),
            routines: normalizeRoutines(merged.routines) ?? current.routines,
            rolledOverCount: moved || merged.rolledOverCount,
          };
        });
      })
      .catch(() => {})
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  // Roll over again if the app stays open past midnight.
  useEffect(() => {
    let lastDay = todayKey();
    const id = setInterval(() => {
      const now = todayKey();
      if (now === lastDay) return;
      lastDay = now;
      setSelectedDate(now);
      setState((s) => {
        const [tasks, moved] = rollOver(s.dayTasks, now);
        return { ...s, dayTasks: materialize(tasks, s.recurring, [now]), rolledOverCount: moved, lastOpenDate: now };
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Show repeating tasks on whichever day is being viewed (today or later).
  useEffect(() => {
    if (!hydrated || selectedDate < todayKey()) return;
    setState((s) => {
      const next = materialize(s.dayTasks, s.recurring, [selectedDate]);
      return next === s.dayTasks ? s : { ...s, dayTasks: next };
    });
  }, [hydrated, selectedDate, state.recurring]);

  useEffect(() => {
    if (!hydrated) return;
    const { activeRoutineId: _ignored, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [hydrated, state]);

  const value = useMemo<DayflowContextValue>(() => {
    const set = (fn: (s: DayflowState) => DayflowState) => setState(fn);
    const mapRoutine = (id: string, fn: (r: Routine) => Routine) =>
      set((s) => ({ ...s, routines: s.routines.map((r) => (r.id === id ? fn(r) : r)) }));

    return {
      ...state,
      hydrated,
      selectedDate,
      setSelectedDate,
      tasksFor: (date) =>
        state.dayTasks.filter((t) => t.date === date && !t.parked).sort((a, b) => a.start - b.start),

      addDayTask: ({ repeatDays, ...task }) => {
        const title = task.title.trim();
        if (!title) return;
        const date = task.date ?? selectedDate;
        set((s) => {
          if (repeatDays?.length) {
            const series: RecurringTask = {
              id: uid('series'), title, start: task.start, duration: task.duration,
              tone: task.tone, icon: task.icon, days: [...repeatDays].sort(), from: date, skip: [],
              essential: !!task.essential,
            };
            const recurring = [...s.recurring, series];
            return { ...s, recurring, dayTasks: materialize(s.dayTasks, [series], [date, todayKey()]) };
          }
          return {
            ...s,
            dayTasks: [...s.dayTasks, { ...task, title, id: uid('day'), date, done: false, label: task.label ?? 'Activity' }],
          };
        });
      },
      seriesFor: (task) => (task.seriesId ? state.recurring.find((r) => r.id === task.seriesId) : undefined),
      updateDayTask: (id, { repeatDays, ...patch }, scope = 'one') =>
        set((s) => {
          const target = s.dayTasks.find((t) => t.id === id);
          if (!target) return s;
          const clean = { ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() || target.title } : {}) };

          // Turning a one-off into a repeating task.
          if (!target.seriesId && repeatDays?.length) {
            const series: RecurringTask = {
              id: uid('series'), title: clean.title ?? target.title, start: clean.start ?? target.start,
              duration: clean.duration ?? target.duration, tone: clean.tone ?? target.tone, icon: clean.icon ?? target.icon,
              days: [...repeatDays].sort(), from: target.date, skip: [],
            };
            return {
              ...s,
              recurring: [...s.recurring, series],
              dayTasks: s.dayTasks.map((t) => (t.id === id ? { ...t, ...clean, seriesId: series.id, label: 'Repeats' } : t)),
            };
          }

          if (target.seriesId && scope === 'series') {
            const sid = target.seriesId;
            const stop = repeatDays !== undefined && repeatDays.length === 0;
            const recurring = stop
              ? s.recurring.filter((r) => r.id !== sid)
              : s.recurring.map((r) =>
                  r.id === sid ? { ...r, ...clean, ...(repeatDays ? { days: [...repeatDays].sort() } : {}) } : r,
                );
            // Update this and every future, unfinished instance; past history stays as it was.
            let dayTasks = s.dayTasks
              .filter((t) => !(stop && t.seriesId === sid && t.date > target.date && !t.done))
              .filter((t) => !(repeatDays && t.seriesId === sid && t.date > target.date && !t.done)) // re-created below
              .map((t) =>
                t.seriesId === sid && t.date >= target.date && !t.done
                  ? { ...t, ...clean, ...(stop ? { seriesId: undefined, label: 'Activity' } : {}) }
                  : t,
              );
            if (!stop) dayTasks = materialize(dayTasks, recurring.filter((r) => r.id === sid), [selectedDate, todayKey()]);
            return { ...s, recurring, dayTasks };
          }

          return { ...s, dayTasks: s.dayTasks.map((t) => (t.id === id ? { ...t, ...clean } : t)) };
        }),
      removeDayTask: (id, scope = 'one') =>
        set((s) => {
          const target = s.dayTasks.find((t) => t.id === id);
          if (!target) return s;
          if (!target.seriesId) return { ...s, dayTasks: s.dayTasks.filter((t) => t.id !== id) };
          const sid = target.seriesId;
          if (scope === 'series') {
            return {
              ...s,
              recurring: s.recurring.filter((r) => r.id !== sid),
              dayTasks: s.dayTasks.filter((t) => !(t.seriesId === sid && t.date >= target.date && !t.done)),
            };
          }
          return {
            ...s,
            recurring: s.recurring.map((r) => (r.id === sid ? { ...r, skip: [...r.skip, target.date] } : r)),
            dayTasks: s.dayTasks.filter((t) => t.id !== id),
          };
        }),
      moveRolledOverToInbox: () =>
        set((s) => {
          const moving = s.dayTasks.filter((t) => t.rolledOver && !t.done);
          return {
            ...s,
            rolledOverCount: 0,
            dayTasks: s.dayTasks.filter((t) => !(t.rolledOver && !t.done)),
            inboxTasks: [...moving.map((t) => ({ id: uid('inbox'), title: t.title, done: false })), ...s.inboxTasks],
          };
        }),
      dismissWelcomeBack: () => set((s) => ({ ...s, awayDays: 0 })),
      setReminderLead: (reminderLead) => set((s) => ({ ...s, reminderLead })),
      setQuietHours: (quietStart, quietEnd) => set((s) => ({ ...s, quietStart, quietEnd })),
      extendTask: (id, minutes, shiftRest = true) =>
        set((s) => {
          const target = s.dayTasks.find((t) => t.id === id);
          if (!target) return s;
          const oldEnd = target.start + target.duration;
          return {
            ...s,
            dayTasks: s.dayTasks.map((t) => {
              if (t.id === id) return { ...t, duration: t.duration + minutes };
              if (shiftRest && t.date === target.date && !t.done && t.start >= oldEnd - 1) {
                return { ...t, start: Math.min(t.start + minutes, 23 * 60 + 55) };
              }
              return t;
            }),
          };
        }),
      shiftRestOfDay: (date, fromMinute, minutes) =>
        set((s) => ({
          ...s,
          dayTasks: s.dayTasks.map((t) =>
            t.date === date && !t.done && t.start >= fromMinute
              ? { ...t, start: Math.min(t.start + minutes, 23 * 60 + 55) }
              : t,
          ),
        })),
      setBufferMinutes: (bufferMinutes) => set((s) => ({ ...s, bufferMinutes })),
      nextFreeStart: (date, notBefore) => {
        // Find the first slot at/after notBefore that doesn't land inside a block.
        let candidate = Math.ceil(notBefore / 5) * 5;
        const sorted = state.dayTasks.filter((t) => t.date === date).sort((a, b) => a.start - b.start);
        for (const t of sorted) {
          if (candidate >= t.start && candidate < t.start + t.duration + state.bufferMinutes) {
            candidate = Math.ceil((t.start + t.duration + state.bufferMinutes) / 5) * 5;
          }
        }
        return Math.min(candidate, 23 * 60 + 45);
      },
      energyFor: (date) => state.energyLog.find((e) => e.date === date)?.level,
      setEnergy: (date, level) =>
        set((s) => ({
          ...s,
          energyLog: [...s.energyLog.filter((e) => e.date !== date), { date, level }].slice(-120),
        })),
      markEnergyPrompted: (date) => set((s) => ({ ...s, energyPromptDate: date })),
      energyHandled: (date) => !!state.energyLog.find((e) => e.date === date)?.handled,
      markEnergyHandled: (date) =>
        set((s) => ({ ...s, energyLog: s.energyLog.map((e) => (e.date === date ? { ...e, handled: true } : e)) })),
      isSurvivalDay: (date) => state.survivalDays.includes(date),
      startSurvivalDay: (date) =>
        set((s) => ({
          ...s,
          survivalDays: Array.from(new Set([...s.survivalDays, date])),
          dayTasks: s.dayTasks.map((t) =>
            t.date === date && !t.done && !isEssential(t) ? { ...t, parked: true } : t,
          ),
        })),
      endSurvivalDay: (date) =>
        set((s) => ({
          ...s,
          survivalDays: s.survivalDays.filter((d) => d !== date),
          dayTasks: s.dayTasks.map((t) => (t.date === date && t.parked ? { ...t, parked: false } : t)),
        })),
      lightenDay: (date, keep) =>
        set((s) => {
          const d = fromDateKey(date);
          d.setDate(d.getDate() + 1);
          const tomorrow = toDateKey(d);
          // Keep essentials plus the first `keep` other unfinished tasks; move the rest.
          let kept = 0;
          const sorted = [...s.dayTasks].sort((a, b) => a.start - b.start);
          const moveIds = new Set<string>();
          for (const t of sorted) {
            if (t.date !== date || t.done || t.parked || isEssential(t)) continue;
            if (kept < keep) kept += 1;
            else moveIds.add(t.id);
          }
          return {
            ...s,
            dayTasks: s.dayTasks.map((t) => {
              if (!moveIds.has(t.id)) return t;
              // Repeating instances get a fresh copy tomorrow anyway — just park today's.
              return t.seriesId ? { ...t, parked: true } : { ...t, date: tomorrow, rolledOver: true };
            }),
          };
        }),
      logTime: (task, actualMinutes) => {
        const actual = Math.round(actualMinutes);
        if (actual < 1) return;
        set((s) => ({
          ...s,
          timeLog: [
            ...s.timeLog,
            { key: timeKey(task.title), title: task.title, planned: task.duration, actual, date: task.date },
          ].slice(-300),
        }));
      },
      toggleDayTask: (id) =>
        set((s) => ({
          ...s,
          dayTasks: s.dayTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      addInboxTask: (title) => {
        const clean = title.trim();
        if (!clean) return;
        set((s) => ({ ...s, inboxTasks: [{ id: uid('inbox'), title: clean, done: false }, ...s.inboxTasks] }));
      },
      toggleInboxTask: (id) =>
        set((s) => ({
          ...s,
          inboxTasks: s.inboxTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      removeInboxTask: (id) => set((s) => ({ ...s, inboxTasks: s.inboxTasks.filter((t) => t.id !== id) })),
      scheduleInboxTask: (id, start, date) =>
        set((s) => {
          const item = s.inboxTasks.find((t) => t.id === id);
          if (!item) return s;
          return {
            ...s,
            inboxTasks: s.inboxTasks.filter((t) => t.id !== id),
            dayTasks: [
              ...s.dayTasks,
              {
                id: uid('day'),
                date: date ?? todayKey(),
                title: item.title,
                start,
                duration: 25,
                tone: TASK_TONES[s.dayTasks.length % TASK_TONES.length],
                icon: 'pencil',
                done: false,
                label: 'From your inbox',
              },
            ],
          };
        }),

      toggleRoutineStep: (rid, sid) =>
        mapRoutine(rid, (r) => ({ ...r, steps: r.steps.map((st) => (st.id === sid ? { ...st, done: !st.done } : st)) })),
      setRoutineStepDone: (rid, sid, done) =>
        mapRoutine(rid, (r) => ({ ...r, steps: r.steps.map((st) => (st.id === sid ? { ...st, done } : st)) })),
      resetRoutine: (rid) => mapRoutine(rid, (r) => ({ ...r, steps: r.steps.map((st) => ({ ...st, done: false })) })),
      saveRoutine: (draft, id) =>
        set((s) => {
          const steps: RoutineStep[] = draft.steps
            .filter((st) => st.title.trim())
            .map((st) => ({ id: st.id ?? uid('step'), title: st.title.trim(), duration: Math.max(1, st.duration), done: false }));
          const routine: Routine = { ...draft, title: draft.title.trim() || 'My routine', id: id ?? uid('routine'), steps };
          return {
            ...s,
            routines: id ? s.routines.map((r) => (r.id === id ? routine : r)) : [...s.routines, routine],
          };
        }),
      removeRoutine: (id) =>
        set((s) => ({
          ...s,
          routines: s.routines.filter((r) => r.id !== id),
          activeRoutineId: s.activeRoutineId === id ? null : s.activeRoutineId,
        })),

      setVisualMode: (visualMode) => set((s) => ({ ...s, visualMode })),
      setActiveRoutineId: (activeRoutineId) => set((s) => ({ ...s, activeRoutineId })),

      completeOnboarding: (profile) =>
        set((s) => {
          const today = todayKey();
          const keep = s.dayTasks.filter((t) => t.date !== today);
          return { ...s, onboarded: true, profile, dayTasks: [...keep, ...buildStarterDay(profile, today)] };
        }),
      resetOnboarding: () => set((s) => ({ ...s, onboarded: false })),
      setRemindersEnabled: (remindersEnabled) => set((s) => ({ ...s, remindersEnabled })),
      setCalendarSyncEnabled: (calendarSyncEnabled) => set((s) => ({ ...s, calendarSyncEnabled })),
      setLiveActivityEnabled: (liveActivityEnabled) => set((s) => ({ ...s, liveActivityEnabled })),
      dismissRolloverBanner: () =>
        set((s) => ({
          ...s,
          rolledOverCount: 0,
          dayTasks: s.dayTasks.map((t) => (t.rolledOver ? { ...t, rolledOver: false } : t)),
        })),
    };
  }, [state, hydrated, selectedDate]);

  return <DayflowContext.Provider value={value}>{children}</DayflowContext.Provider>;
}

export function useDayflow() {
  const context = useContext(DayflowContext);
  if (!context) throw new Error('useDayflow must be used inside DayflowProvider');
  return context;
}

export function useVisualMode(): VisualMode {
  return useContext(DayflowContext)?.visualMode ?? 'playful';
}
