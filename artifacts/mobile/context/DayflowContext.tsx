import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type TaskTone = 'sage' | 'apricot' | 'sky' | 'lilac' | 'rose' | 'lemon';
export const TASK_TONES: TaskTone[] = ['lilac', 'sky', 'sage', 'apricot', 'rose', 'lemon'];
export const TASK_ICONS = [
  'sun', 'coffee', 'book-open', 'briefcase', 'mail', 'phone', 'shopping-cart', 'heart',
  'activity', 'music', 'home', 'moon', 'edit-3', 'monitor', 'smile', 'star',
] as const;
export type TaskIcon = (typeof TASK_ICONS)[number];

/** Minutes since midnight → "9:05 AM" */
export function formatMinutes(total: number) {
  if (!Number.isFinite(total)) return '--:--';
  total = Math.round(total);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
export type VisualMode = 'playful' | 'focused';

export interface DayTask {
  id: string;
  title: string;
  /** Start time, minutes since midnight */
  start: number;
  duration: number;
  tone: TaskTone;
  icon: TaskIcon;
  done: boolean;
  label: string;
}

export interface NewDayTask {
  title: string;
  start: number;
  duration: number;
  tone: TaskTone;
  icon: TaskIcon;
  label?: string;
}

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
  steps: RoutineStep[];
}

interface DayflowState {
  dayTasks: DayTask[];
  inboxTasks: InboxTask[];
  routines: Routine[];
  visualMode: VisualMode;
  activeRoutineId: string | null;
}

interface DayflowContextValue extends DayflowState {
  addInboxTask: (title: string) => void;
  toggleDayTask: (id: string) => void;
  addDayTask: (task: NewDayTask) => void;
  removeDayTask: (id: string) => void;
  toggleInboxTask: (id: string) => void;
  scheduleInboxTask: (id: string, start?: number) => void;
  toggleRoutineStep: (routineId: string, stepId: string) => void;
  setVisualMode: (mode: VisualMode) => void;
  setActiveRoutineId: (id: string | null) => void;
}

const STORAGE_KEY = 'dayflow-ui-prototype-v3';

/** Upgrade tasks saved by older versions (string `time`, no `icon`). */
function parseLegacyTime(value: unknown): number {
  if (typeof value !== 'string') return 9 * 60;
  const m = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 9 * 60;
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === 'PM') h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
}

function normalizeDayTasks(tasks: unknown): DayTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((raw) => {
    const t = raw as Partial<DayTask> & { time?: string };
    return {
      id: t.id ?? `day-${Math.random().toString(36).slice(2, 9)}`,
      title: t.title ?? 'Untitled',
      start: Number.isFinite(t.start) ? (t.start as number) : parseLegacyTime(t.time),
      duration: Number.isFinite(t.duration) ? (t.duration as number) : 25,
      tone: TASK_TONES.includes(t.tone as TaskTone) ? (t.tone as TaskTone) : 'lilac',
      icon: TASK_ICONS.includes(t.icon as TaskIcon) ? (t.icon as TaskIcon) : 'star',
      done: !!t.done,
      label: t.label ?? 'Activity',
    };
  });
}

const initialState: DayflowState = {
  dayTasks: [
    { id: 'day-1', title: 'Wake up gently', start: 7 * 60 + 30, duration: 30, tone: 'lemon', icon: 'sun', done: true, label: 'Routine' },
    { id: 'day-2', title: 'Breakfast & meds', start: 8 * 60 + 15, duration: 30, tone: 'apricot', icon: 'coffee', done: false, label: 'Self-care' },
    { id: 'day-3', title: 'Review the project brief', start: 9 * 60 + 30, duration: 60, tone: 'lilac', icon: 'briefcase', done: false, label: 'Focus time' },
    { id: 'day-4', title: 'Short walk outside', start: 11 * 60, duration: 20, tone: 'sage', icon: 'activity', done: false, label: 'Reset' },
    { id: 'day-5', title: 'Lunch break', start: 12 * 60 + 30, duration: 45, tone: 'rose', icon: 'heart', done: false, label: 'Reset' },
    { id: 'day-6', title: 'Reply to two emails', start: 14 * 60, duration: 25, tone: 'sky', icon: 'mail', done: false, label: 'Small task' },
    { id: 'day-7', title: 'Wind down', start: 21 * 60, duration: 30, tone: 'lilac', icon: 'moon', done: false, label: 'Routine' },
  ],
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
      tone: 'sage',
      steps: [
        { id: 'm-1', title: 'Drink a glass of water', duration: 2, done: true },
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
      steps: [
        { id: 'e-1', title: 'Put tomorrow’s essentials by the door', duration: 4, done: false },
        { id: 'e-2', title: 'Reset one small surface', duration: 5, done: false },
        { id: 'e-3', title: 'Wind down with a book', duration: 10, done: false },
      ],
    },
  ],
  visualMode: 'playful',
  activeRoutineId: null,
};

const DayflowContext = createContext<DayflowContextValue | null>(null);

export function DayflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DayflowState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<DayflowState>;
          setState((current) => ({
            ...current,
            ...parsed,
            dayTasks: parsed.dayTasks ? normalizeDayTasks(parsed.dayTasks) : current.dayTasks,
            activeRoutineId: null,
          }));
        }
      })
      .catch(() => {
        // Keep the starter plan available if local storage cannot be read.
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persisted = {
      dayTasks: state.dayTasks,
      inboxTasks: state.inboxTasks,
      routines: state.routines,
      visualMode: state.visualMode,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {
      // The in-memory prototype remains usable if local storage is unavailable.
    });
  }, [hydrated, state]);

  const value = useMemo<DayflowContextValue>(
    () => ({
      ...state,
      dayTasks: normalizeDayTasks(state.dayTasks),
      addInboxTask: (title) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;
        setState((current) => ({
          ...current,
          inboxTasks: [
            { id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: cleanTitle, done: false },
            ...current.inboxTasks,
          ],
        }));
      },
      toggleDayTask: (id) =>
        setState((current) => ({
          ...current,
          dayTasks: current.dayTasks.map((task) =>
            task.id === id ? { ...task, done: !task.done } : task,
          ),
        })),
      addDayTask: (task) => {
        const title = task.title.trim();
        if (!title) return;
        setState((current) => ({
          ...current,
          dayTasks: [
            ...current.dayTasks,
            {
              ...task,
              title,
              id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              done: false,
              label: task.label ?? 'Activity',
            },
          ],
        }));
      },
      removeDayTask: (id) =>
        setState((current) => ({
          ...current,
          dayTasks: current.dayTasks.filter((task) => task.id !== id),
        })),
      toggleInboxTask: (id) =>
        setState((current) => ({
          ...current,
          inboxTasks: current.inboxTasks.map((task) =>
            task.id === id ? { ...task, done: !task.done } : task,
          ),
        })),
      scheduleInboxTask: (id, start) =>
        setState((current) => {
          const item = current.inboxTasks.find((task) => task.id === id);
          if (!item) return current;
          const now = new Date();
          const nextSlot = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
          return {
            ...current,
            inboxTasks: current.inboxTasks.filter((task) => task.id !== id),
            dayTasks: [
              ...current.dayTasks,
              {
                id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: item.title,
                start: start ?? Math.min(nextSlot, 23 * 60),
                duration: 25,
                tone: TASK_TONES[current.dayTasks.length % TASK_TONES.length],
                icon: 'edit-3',
                done: false,
                label: 'From your inbox',
              },
            ],
          };
        }),
      toggleRoutineStep: (routineId, stepId) =>
        setState((current) => ({
          ...current,
          routines: current.routines.map((routine) =>
            routine.id !== routineId
              ? routine
              : {
                  ...routine,
                  steps: routine.steps.map((step) =>
                    step.id === stepId ? { ...step, done: !step.done } : step,
                  ),
                },
          ),
        })),
      setVisualMode: (visualMode) =>
        setState((current) => ({ ...current, visualMode })),
      setActiveRoutineId: (activeRoutineId) =>
        setState((current) => ({ ...current, activeRoutineId })),
    }),
    [state],
  );

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
