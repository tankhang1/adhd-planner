// Pure helpers for learning how long things really take (no React Native deps — unit-testable).

/** One finished focus session: how long it was planned vs. how long it really took. */
export interface TimeLogEntry {
  key: string;
  title: string;
  planned: number;
  actual: number;
  date: string;
}

/** Normalises a title so "Reply to emails" and "reply to  emails!" share history. */
export function timeKey(title: string) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

export interface TimeInsight {
  samples: number;
  typicalActual: number;
  typicalPlanned: number;
  /** actual / planned; > 1 means it usually takes longer than planned */
  ratio: number;
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/** What history says about a task title. Needs at least 2 sessions. */
export function insightFor(log: TimeLogEntry[], title: string): TimeInsight | null {
  const key = timeKey(title);
  if (!key) return null;
  const rows = log.filter((r) => r.key === key).slice(-8);
  if (rows.length < 2) return null;
  const typicalActual = Math.round(median(rows.map((r) => r.actual)));
  const typicalPlanned = Math.round(median(rows.map((r) => r.planned)));
  return { samples: rows.length, typicalActual, typicalPlanned, ratio: typicalActual / Math.max(1, typicalPlanned) };
}

/** Overall estimation tendency across all sessions (last 30). */
export function overallTendency(log: TimeLogEntry[]): { samples: number; ratio: number } | null {
  const rows = log.slice(-30);
  if (rows.length < 3) return null;
  return { samples: rows.length, ratio: median(rows.map((r) => r.actual / Math.max(1, r.planned))) };
}
