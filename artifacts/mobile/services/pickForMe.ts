import type { DayTask, InboxTask } from '@/context/DayflowContext';

/** `reason` is an i18n key; `reasonParams` fills it in. */
export type Suggestion =
  | { kind: 'task'; task: DayTask; reason: string; reasonParams?: Record<string, unknown> }
  | { kind: 'inbox'; item: InboxTask; reason: string; reasonParams?: Record<string, unknown> };

/** The task happening now, else the next unfinished one. Deterministic. */
export function currentOrNext(tasks: DayTask[], nowMin: number): DayTask | undefined {
  const open = tasks.filter((t) => !t.done).sort((a, b) => a.start - b.start);
  return (
    open.find((t) => nowMin >= t.start && nowMin < t.start + t.duration) ??
    open.find((t) => t.start >= nowMin) ??
    open.find((t) => t.rolledOver) ??
    open[open.length - 1]
  );
}

/**
 * Pick one doable thing so the user doesn't have to decide.
 * Prefers: what's happening now → short tasks coming up soon → anything left today → inbox.
 * `exclude` holds ids already offered (for "another one").
 */
export function pickForMe(
  tasks: DayTask[],
  inbox: InboxTask[],
  nowMin: number,
  exclude: string[] = [],
  random: () => number = Math.random,
): Suggestion | null {
  const open = tasks.filter((t) => !t.done && !exclude.includes(t.id));

  const now = open.find((t) => nowMin >= t.start && nowMin < t.start + t.duration);
  if (now) return { kind: 'task', task: now, reason: 'oneThing.reasonNow' };

  const scored = open
    .map((t) => {
      const until = t.start - nowMin; // negative = missed earlier today
      const soon = until >= 0 ? 1 / (1 + until / 60) : 0.4; // missed tasks still welcome
      const short = t.duration <= 15 ? 0.8 : t.duration <= 30 ? 0.5 : 0;
      return { t, score: soon + short + (t.rolledOver ? 0.2 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length) {
    // A little randomness among the top picks keeps it from feeling robotic.
    const sum = scored.reduce((s, x) => s + x.score, 0) || 1;
    let r = random() * sum;
    const chosen = scored.find((x) => (r -= x.score) <= 0) ?? scored[0];
    const t = chosen.t;
    const reason =
      t.duration <= 15 ? 'oneThing.reasonShort'
      : t.start - nowMin >= 0 && t.start - nowMin <= 60 ? 'oneThing.reasonSoon'
      : t.rolledOver ? 'oneThing.reasonWaiting'
      : 'oneThing.reasonGood';
    return { kind: 'task', task: t, reason, reasonParams: { count: t.duration } };
  }

  const fromInbox = inbox.filter((i) => !i.done && !exclude.includes(i.id));
  if (fromInbox.length) {
    const item = fromInbox[Math.floor(random() * fromInbox.length)];
    return { kind: 'inbox', item, reason: 'oneThing.reasonInbox' };
  }
  return null;
}
