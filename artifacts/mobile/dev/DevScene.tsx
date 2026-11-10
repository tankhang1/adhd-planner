import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { router } from 'expo-router';
import { SCENE } from './scene';
import { todayKey, useDayflow } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';
import { mondayOf, weekToReview } from '@/services/weekly';
import { devEvents } from '@/lib/devEvents';

const r5 = (m: number) => Math.round(m / 5) * 5;

/** Realistic, colourful demo day built around the current time. */
function demoTasks(now: number, date: string): DayTask[] {
  const active = r5(now) - 20;
  const t = (id: string, title: string, start: number, duration: number, tone: DayTask['tone'], icon: DayTask['icon'], done = false, extra: Partial<DayTask> = {}): DayTask =>
    ({ id, date, title, start, duration, tone, icon, done, label: 'Activity', ...extra });
  return [
    t('d1', 'Wake up gently', 7 * 60 + 30, 15, 'lemon', 'weather-sunny', true),
    t('d2', 'Meds & a glass of water', 7 * 60 + 45, 5, 'sky', 'pill', true),
    t('d3', 'Breakfast', 8 * 60, 30, 'apricot', 'food-apple', true),
    t('d4', 'Morning stretch', 9 * 60, 15, 'sage', 'yoga', true),
    t('d5', 'Finish the design review', active, 45, 'lilac', 'laptop'),
    t('d6', 'Walk the dog', active + 55, 20, 'sage', 'dog'),
    t('d7', 'Lunch with Sam', active + 120, 60, 'rose', 'silverware-fork-knife', false, { travel: 15, prep: 10 }),
    t('d8', 'Reply to emails', active + 200, 25, 'sky', 'email'),
    t('d9', 'Laundry', active + 250, 20, 'lemon', 'washing-machine'),
    t('d10', 'Wind down', 21 * 60 + 30, 30, 'lilac', 'weather-night'),
  ];
}

/** Watches dev/scene.ts; on change, loads demo data and navigates to that screen. */
/** A busy, successful last week (for the weekly look-back scene). */
function lastWeekTasks(today: Date): DayTask[] {
  const out: DayTask[] = [];
  const titles: Array<[string, DayTask['tone'], DayTask['icon'], number]> = [
    ['Meds & water', 'sky', 'pill', 5], ['Deep work block', 'lilac', 'laptop', 60], ['Gym', 'sage', 'run', 45],
    ['Call mom', 'rose', 'phone', 20], ['Groceries', 'apricot', 'cart', 30], ['Read 20 pages', 'lemon', 'book-open-variant', 25],
  ];
  for (let back = 8; back >= 2; back--) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    titles.forEach(([title, tone, icon, duration], i) => {
      if ((back + i) % 4 === 0) return; // not every day is perfect
      out.push({ id: `w${back}-${i}`, date: key, title, start: 8 * 60 + i * 90, duration, tone, icon, done: true, label: 'Activity' });
    });
  }
  return out;
}

export function DevScene() {
  const { devPatch, routines } = useDayflow();
  useEffect(() => {
    if (!__DEV__ || !SCENE) return;
    LogBox.ignoreAllLogs(true);
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    const date = todayKey();
    devPatch({
      language: 'en',
      onboarded: true,
      dayTasks: SCENE === 'weekly'
        ? [...lastWeekTasks(d), ...demoTasks(now, date)]
        : SCENE === 'nudges'
          ? demoTasks(now, date).map((t) =>
              t.id === 'd5' ? { ...t, start: now - 60, duration: 48 } // ran over 12 min ago
              : t.id === 'd7' ? { ...t, title: 'Dentist appointment', icon: 'toothbrush', start: r5(now) + 40, duration: 45, travel: 25, prep: 15 }
              : t)
          : demoTasks(now, date),
      inboxTasks: [
        { id: 'i1', title: 'Book a haircut', done: false },
        { id: 'i2', title: 'Renew passport before March', done: false },
        { id: 'i3', title: 'Text Jess back about Saturday', done: false },
        { id: 'i4', title: 'Cancel the free trial I forgot about', done: false },
        { id: 'i5', title: 'Buy birthday gift for Leo', done: false },
      ],
      showUpDays: Array.from({ length: 9 }, (_, i) => {
        const x = new Date(d);
        x.setDate(x.getDate() - i);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      }),
      energyLog: [{ date, level: 'high', handled: true }],
      energyPromptDate: date,
      lastReviewWeek: SCENE === 'weekly' ? null : weekToReview(d, null) ?? mondayOf(d), // nothing left to review
      awayDays: 0,
      rolledOverCount: 0,
      survivalDays: [],
      routines: routines.map((r) => r.id === 'morning'
        ? { ...r, steps: r.steps.map((st, i) => ({ ...st, done: i < 2 })) }
        : r),
    });
    const go = () => {
      if (router.canDismiss()) router.dismissAll();
      switch (SCENE) {
        case 'today': break;
        case 'one': router.push('/one-thing'); break;
        case 'focus': router.push({ pathname: '/focus', params: { taskId: 'd6', left: '742' } }); break;
        case 'energy': devEvents.emit('openCheckIn'); break;
        case 'routine': router.push({ pathname: '/routine-run', params: { id: 'morning' } }); break;
        case 'inbox': router.replace('/(tabs)/inbox'); break;
        case 'nudges': router.push('/nudges'); break;
        case 'weekly': router.replace('/(tabs)'); break;
      }
    };
    const id = setTimeout(go, 600);
    return () => clearTimeout(id);
  }, [SCENE]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
