// Pure logic for the Nudges page and the bell badge (no React Native deps — unit-testable).

export interface NudgeTask {
  id: string;
  date: string;
  title: string;
  start: number;
  duration: number;
  done: boolean;
  rolledOver?: boolean;
  parked?: boolean;
  travel?: number;
  prep?: number;
}

export type Nudge =
  | { kind: 'overrun'; id: string; task: NudgeTask; over: number }
  | { kind: 'ready'; id: string; task: NudgeTask; leave: number; leaveIn: number }
  | { kind: 'carried'; id: string; count: number }
  | { kind: 'survival'; id: string; count: number };

/** Overrun blocks stay visible for this long after their end. */
export const OVERRUN_WINDOW = 45;

/**
 * Everything worth a gentle look right now, most urgent first.
 * `now` is minutes since midnight on `today`.
 */
export function collectNudges(tasks: NudgeTask[], today: string, now: number, survival: boolean): Nudge[] {
  const todays = tasks.filter((t) => t.date === today);
  const open = todays.filter((t) => !t.done && !t.parked);
  const out: Nudge[] = [];

  for (const t of open) {
    const end = t.start + t.duration;
    if (end <= now && now - end < OVERRUN_WINDOW) {
      out.push({ kind: 'overrun', id: `overrun-${t.id}`, task: t, over: Math.max(1, Math.round(now - end)) });
    }
  }
  out.sort((a, b) => (a.kind === 'overrun' && b.kind === 'overrun' ? a.over - b.over : 0));

  for (const t of open) {
    if (!t.travel) continue;
    const leave = t.start - t.travel;
    const getReady = leave - (t.prep ?? 0);
    if (now >= getReady && now < t.start) {
      out.push({ kind: 'ready', id: `ready-${t.id}`, task: t, leave, leaveIn: Math.max(0, Math.ceil(leave - now)) });
    }
  }

  const carried = open.filter((t) => t.rolledOver).length;
  if (carried) out.push({ kind: 'carried', id: 'carried', count: carried });

  if (survival) {
    const parked = todays.filter((t) => t.parked).length;
    if (parked) out.push({ kind: 'survival', id: 'survival', count: parked });
  }
  return out;
}
