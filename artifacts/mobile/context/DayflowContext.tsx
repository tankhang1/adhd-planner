import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type TaskTone = 'sage' | 'apricot' | 'sky' | 'lilac';
export type VisualMode = 'playful' | 'focused';

export interface DayTask {
  id: string;
  title: string;
  time: string;
  duration: number;
  tone: TaskTone;
  done: boolean;
  label: string;
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
  toggleInboxTask: (id: string) => void;
  scheduleInboxTask: (id: string) => void;
  toggleRoutineStep: (routineId: string, stepId: string) => void;
  setVisualMode: (mode: VisualMode) => void;
  setActiveRoutineId: (id: string | null) => void;
}

const STORAGE_KEY = 'dayflow-ui-prototype-v1';

const initialState: DayflowState = {
  dayTasks: [
    {
      id: 'day-1',
      title: 'Ease into the day',
      time: '9:00 AM',
      duration: 20,
      tone: 'sage',
      done: true,
      label: 'Routine',
    },
    {
      id: 'day-2',
      title: 'Review the project brief',
      time: '10:00 AM',
      duration: 45,
      tone: 'apricot',
      done: false,
      label: 'Focus time',
    },
    {
      id: 'day-3',
      title: 'Take a real lunch break',
      time: '12:30 PM',
      duration: 40,
      tone: 'sky',
      done: false,
      label: 'Reset',
    },
    {
      id: 'day-4',
      title: 'Reply to two important emails',
      time: '2:00 PM',
      duration: 25,
      tone: 'lilac',
      done: false,
      label: 'Small task',
    },
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
      toggleInboxTask: (id) =>
        setState((current) => ({
          ...current,
          inboxTasks: current.inboxTasks.map((task) =>
            task.id === id ? { ...task, done: !task.done } : task,
          ),
        })),
      scheduleInboxTask: (id) =>
        setState((current) => {
          const item = current.inboxTasks.find((task) => task.id === id);
          if (!item) return current;
          const tones: TaskTone[] = ['sage', 'apricot', 'sky', 'lilac'];
          return {
            ...current,
            inboxTasks: current.inboxTasks.filter((task) => task.id !== id),
            dayTasks: [
              ...current.dayTasks,
              {
                id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: item.title,
                time: '3:30 PM',
                duration: 25,
                tone: tones[current.dayTasks.length % tones.length],
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
