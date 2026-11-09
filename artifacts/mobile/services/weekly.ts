// Pure helpers for the weekly look-back (no React Native deps — unit-testable).

export interface WeekTask {
  date: string;
  title: string;
  duration: number;
  done: boolean;
  moved?: number;
}
export interface WeekEnergy {
  date: string;
  level: 'low' | 'okay' | 'high';
}

const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Monday of the week containing `d`, as YYYY-MM-DD. */
export function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(12, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return key(m);
}

/** The 7 date keys of the week starting at `monday`. */
export function weekDates(monday: string) {
  const [y, mo, da] = monday.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => key(new Date(y, mo - 1, da + i, 12)));
}

/**
 * Which week (if any) should be reviewed now: on Sunday, this week;
 * Monday–Wednesday, last week (in case Sunday was missed). Never twice.
 */
export function weekToReview(now: Date, lastReviewed: string | null): string | null {
  const dow = now.getDay(); // 0 = Sunday
  let target: string | null = null;
  if (dow === 0) target = mondayOf(now);
  else if (dow >= 1 && dow <= 3) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 7);
    target = mondayOf(prev);
  }
  if (!target || target === lastReviewed) return null;
  return target;
}

export interface WeekSummary {
  done: number;
  minutes: number;
  daysShownUp: number;
  /** Day with the most tasks finished */
  bestDay: string | null;
  /** Task titles that keep getting moved (2+ times) */
  oftenMoved: string[];
  lowEnergyDays: number;
}

export function summarizeWeek(
  monday: string,
  tasks: WeekTask[],
  showUpDays: string[],
  energy: WeekEnergy[],
): WeekSummary {
  const dates = new Set(weekDates(monday));
  const inWeek = tasks.filter((t) => dates.has(t.date));
  const done = inWeek.filter((t) => t.done);
  const perDay = new Map<string, number>();
  for (const t of done) perDay.set(t.date, (perDay.get(t.date) ?? 0) + 1);
  let bestDay: string | null = null;
  for (const [d, n] of perDay) if (!bestDay || n > (perDay.get(bestDay) ?? 0)) bestDay = d;
  const oftenMoved = Array.from(
    new Set(tasks.filter((t) => (t.moved ?? 0) >= 2 && !t.done).map((t) => t.title)),
  ).slice(0, 3);
  return {
    done: done.length,
    minutes: done.reduce((s, t) => s + t.duration, 0),
    daysShownUp: showUpDays.filter((d) => dates.has(d)).length,
    bestDay,
    oftenMoved,
    lowEnergyDays: energy.filter((e) => dates.has(e.date) && e.level === 'low').length,
  };
}
