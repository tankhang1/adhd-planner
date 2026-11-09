import palette from '@/constants/colors';
import { fromDateKey, toDateKey } from '@/context/DayflowContext';
import type { DayTask, TaskIcon } from '@/context/DayflowContext';

/** Feather icon → SF Symbol for iOS widgets / Live Activity. */
export const SF_SYMBOL: Record<TaskIcon, string> = {
  pill: 'pills.fill',
  'cup-water': 'drop.fill',
  'shower-head': 'shower.fill',
  toothbrush: 'mouth.fill',
  'tshirt-crew': 'tshirt.fill',
  bed: 'bed.double.fill',
  'food-apple': 'leaf.fill',
  'silverware-fork-knife': 'fork.knife',
  coffee: 'cup.and.saucer.fill',
  walk: 'figure.walk',
  run: 'figure.run',
  yoga: 'figure.yoga',
  meditation: 'figure.mind.and.body',
  sofa: 'sofa.fill',
  'weather-sunny': 'sun.max.fill',
  'weather-night': 'moon.fill',
  briefcase: 'briefcase.fill',
  laptop: 'laptopcomputer',
  'book-open-variant': 'book.fill',
  school: 'graduationcap.fill',
  pencil: 'pencil',
  brain: 'brain.head.profile',
  target: 'target',
  'timer-sand': 'hourglass',
  broom: 'sparkles',
  'washing-machine': 'washer.fill',
  'trash-can': 'trash.fill',
  cart: 'cart.fill',
  cash: 'banknote.fill',
  car: 'car.fill',
  home: 'house.fill',
  dog: 'pawprint.fill',
  email: 'envelope.fill',
  phone: 'phone.fill',
  'account-group': 'person.2.fill',
  'calendar-check': 'calendar.badge.checkmark',
  music: 'music.note',
  'gamepad-variant': 'gamecontroller.fill',
  palette: 'paintpalette.fill',
  heart: 'heart.fill',
  'emoticon-happy': 'face.smiling',
  star: 'star.fill',
};

export interface WidgetTask {
  id: string;
  title: string;
  start: number; // unix seconds
  end: number;
  tone: string;
  ink: string;
  icon: string; // SF symbol
  done: boolean;
}

export interface WidgetPayload {
  updatedAt: number;
  tasks: WidgetTask[];
}

const toUnix = (task: DayTask, minutes: number) => {
  const d = fromDateKey(task.date);
  d.setMinutes(minutes);
  return Math.floor(d.getTime() / 1000);
};

/** Today + tomorrow, so the widget keeps working past midnight without the app. */
export function buildWidgetPayload(tasks: DayTask[], now = new Date()): WidgetPayload {
  const today = toDateKey(now);
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  const tomorrow = toDateKey(t);
  const c = palette.light;
  return {
    updatedAt: Math.floor(now.getTime() / 1000),
    tasks: tasks
      .filter((x) => (x.date === today || x.date === tomorrow) && !x.parked)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
      .map((x) => ({
        id: x.id,
        title: x.title,
        start: toUnix(x, x.start),
        end: toUnix(x, x.start + x.duration),
        tone: c[x.tone],
        ink: c[`${x.tone}Ink` as const],
        icon: SF_SYMBOL[x.icon] ?? 'circle.fill',
        done: x.done,
      })),
  };
}

export function currentAndNext(payload: WidgetPayload, nowSec = Date.now() / 1000) {
  const open = payload.tasks.filter((t) => !t.done);
  const current = open.find((t) => t.start <= nowSec && t.end > nowSec) ?? null;
  const next = open.find((t) => t.start > nowSec) ?? null;
  return { current, next };
}
