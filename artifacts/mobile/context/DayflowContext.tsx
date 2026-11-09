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
}

export type TaskDraft = Pick<DayTask, 'title' | 'start' | 'duration' | 'tone' | 'icon'> & {
  date?: string;
  label?: string;
};

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
}

interface DayflowContextValue extends DayflowState {
  hydrated: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  tasksFor: (date: string) => DayTask[];
  addDayTask: (task: TaskDraft) => void;
  updateDayTask: (id: string, patch: Partial<TaskDraft>) => void;
  removeDayTask: (id: string) => void;
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
function rollOver(tasks: DayTask[], today: string): [DayTask[], number] {
  let moved = 0;
  const next = tasks
    .filter((t) => !(t.date < today && t.done)) // past & done → archive (drop)
    .map((t) => {
      if (t.date < today && !t.done) {
        moved += 1;
        return { ...t, date: today, rolledOver: true };
      }
      return t;
    });
  return [next, moved];
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
          return {
            ...merged,
            dayTasks: tasks,
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
        return { ...s, dayTasks: tasks, rolledOverCount: moved };
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

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
        state.dayTasks.filter((t) => t.date === date).sort((a, b) => a.start - b.start),

      addDayTask: (task) => {
        const title = task.title.trim();
        if (!title) return;
        set((s) => ({
          ...s,
          dayTasks: [
            ...s.dayTasks,
            { ...task, title, id: uid('day'), date: task.date ?? selectedDate, done: false, label: task.label ?? 'Activity' },
          ],
        }));
      },
      updateDayTask: (id, patch) =>
        set((s) => ({
          ...s,
          dayTasks: s.dayTasks.map((t) =>
            t.id === id ? { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title } : t,
          ),
        })),
      removeDayTask: (id) => set((s) => ({ ...s, dayTasks: s.dayTasks.filter((t) => t.id !== id) })),
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
