// Dayflow's planning helpers, 100% on-device. No server, no API key, nothing leaves the phone.
//  1. Apple Foundation Models (iOS 26+ with Apple Intelligence) via modules/dayflow-ai.
//  2. Everywhere else (Android, older iPhones, Apple Intelligence off): a simple rule-based
//     planner that still turns a brain dump into a sensible, spaced-out schedule.

import { TASK_TONES, type TaskIcon, type TaskTone } from '@/context/DayflowContext';
import { DayflowAI } from '@/modules/dayflow-ai';
import { parseQuickAdd } from '@/services/quickParse';
import i18n, { tr } from '@/i18n';

export type AiErrorCode = 'refused' | 'unavailable';
export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

export interface AiPlannedTask {
  title: string;
  start: number;
  duration: number;
  tone: TaskTone;
  icon: TaskIcon;
  essential: boolean;
}
export interface AiPlan {
  tasks: AiPlannedTask[];
  later: string[];
  note: string;
  /** Which engine produced it: Apple's on-device model, or the simple built-in planner. */
  source: 'device' | 'simple';
}
export interface AiStep {
  title: string;
  minutes: number;
}

/** Planning always works (it falls back to the built-in planner), so the buttons can always show. */
export const aiAvailable = () => true;

/** True when Apple's on-device model is ready to use. */
export const smartModelReady = () => {
  try {
    return DayflowAI?.status() === 'available';
  } catch {
    return false;
  }
};

const lang = () => (i18n.language || 'en').slice(0, 2);

/* --------------------------------- Plan day --------------------------------- */

interface PlanInput {
  dump: string;
  from: number;
  until: number;
  busy: Array<{ start: number; duration: number }>;
  energy?: 'low' | 'okay' | 'high';
}

export async function aiPlanDay(input: PlanInput): Promise<AiPlan> {
  if (smartModelReady() && DayflowAI) {
    try {
      const raw = JSON.parse(await DayflowAI.planDay({ ...input, language: lang() })) as Omit<AiPlan, 'source'>;
      return { ...sanitize(raw, input), source: 'device' };
    } catch {
      // Guardrail refusal or a model hiccup: fall through to the simple planner.
    }
  }
  return simplePlan(input);
}

/** Final guard for model output: snap to 5 min, stay in the window, no overlaps. */
function sanitize(plan: Omit<AiPlan, 'source'>, input: PlanInput): Omit<AiPlan, 'source'> {
  const taken: Array<[number, number]> = input.busy.map((b) => [b.start, b.start + b.duration]);
  const clash = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);
  const tasks: AiPlannedTask[] = [];
  const later = [...(plan.later ?? [])];
  for (const t of [...(plan.tasks ?? [])].sort((a, b) => a.start - b.start)) {
    const duration = Math.min(180, Math.max(5, Math.round(t.duration / 5) * 5));
    const start = Math.round(t.start / 5) * 5;
    if (!t.title?.trim() || start < input.from || start + duration > input.until || clash(start, start + duration)) {
      if (t.title?.trim()) later.push(t.title);
      continue;
    }
    taken.push([start, start + duration]);
    tasks.push({
      ...t,
      title: t.title.trim().slice(0, 80),
      start,
      duration,
      tone: (TASK_TONES as string[]).includes(t.tone) ? t.tone : TASK_TONES[tasks.length % TASK_TONES.length],
      icon: t.icon || guessIcon(t.title),
    });
  }
  return { tasks, later: later.slice(0, 20), note: (plan.note || tr('ai.fallbackNote')).slice(0, 200) };
}

/* ----------------------------- Simple planner ------------------------------ */

/** Keyword → icon, across the app's languages (plus Vietnamese). First match wins. */
const ICON_HINTS: Array<[RegExp, TaskIcon]> = [
  [/\b(med|meds|pill|tablet)|medikament|tablette|薬|약|thuốc/i, 'pill'],
  [/\b(call|phone|ring)|anruf|telefon|電話|전화|gọi/i, 'phone'],
  [/\b(email|e-mail|mail|reply|inbox)|antwort|メール|返信|메일|답장|trả lời|email/i, 'email'],
  [/\b(gym|run|workout|exercise)|sport|training|ジム|運動|운동|헬스|tập/i, 'run'],
  [/\b(walk|dog)|spazier|hund|散歩|犬|산책|강아지|đi dạo|chó/i, 'walk'],
  [/\b(laundry|wash)|wäsche|洗濯|빨래|giặt/i, 'washing-machine'],
  [/\b(clean|tidy|dishes)|putzen|aufräumen|掃除|片付け|청소|정리|dọn/i, 'broom'],
  [/\b(shop|buy|grocer)|einkauf|kaufen|買い物|장보기|mua/i, 'cart'],
  [/\b(pay|bill|bank|tax)|rechnung|zahlen|支払|振込|납부|결제|thanh toán|hóa đơn/i, 'cash'],
  [/\b(study|homework|read|exam|learn)|lernen|hausaufgabe|lesen|勉強|宿題|読|공부|숙제|học|đọc/i, 'book-open-variant'],
  [/\b(slides|report|work|code|write|essay|project)|arbeit|bericht|仕事|資料|作業|업무|보고서|làm việc|báo cáo/i, 'laptop'],
  [/\b(eat|lunch|dinner|breakfast|cook)|essen|kochen|ご飯|昼|夕食|料理|밥|점심|저녁|요리|ăn|nấu/i, 'silverware-fork-knife'],
  [/\b(shower|bath)|dusche|シャワー|風呂|샤워|tắm/i, 'shower-head'],
  [/\b(sleep|bed|nap)|schlaf|寝|睡眠|잠|ngủ/i, 'bed'],
  [/\b(meet|meeting)|termin|treffen|会議|打ち合わせ|회의|미팅|họp/i, 'account-group'],
  [/\b(doctor|dentist|appointment)|arzt|zahnarzt|病院|歯医者|병원|치과|bác sĩ|nha sĩ/i, 'calendar-check'],
];
export function guessIcon(title: string): TaskIcon {
  return ICON_HINTS.find(([re]) => re.test(title))?.[1] ?? 'star';
}
const ESSENTIAL = /\b(med|meds|pill|eat|lunch|dinner|breakfast|deadline|due)|medikament|essen|薬|ご飯|약|밥|thuốc|ăn|hạn chót/i;

/** Rule-based planner: one line = one task, spaced out into the free time left today. */
function simplePlan(input: PlanInput): AiPlan {
  const low = input.energy === 'low';
  const gap = 10;
  const maxTasks = low ? 3 : 8;
  const defaultLen = low ? 15 : 25;
  const lines = input.dump
    .split(/\n|;|•|·/)
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 30);

  const taken: Array<[number, number]> = input.busy.map((b) => [b.start, b.start + b.duration]);
  const clash = (s: number, e: number) => taken.some(([a, b]) => s < b + gap && e + gap > a);
  const tasks: AiPlannedTask[] = [];
  const later: string[] = [];

  // Items with a fixed time go first, then the rest fill the gaps in the order written.
  const parsed = lines.map((l) => ({ line: l, p: parseQuickAdd(l) }));
  const ordered = [...parsed.filter((x) => x.p.start != null), ...parsed.filter((x) => x.p.start == null)];

  for (const { line, p } of ordered) {
    const title = (p.title || line).slice(0, 80);
    const duration = Math.min(120, p.duration ?? defaultLen);
    if (p.dayOffset === 1 || tasks.length >= maxTasks) {
      later.push(title);
      continue;
    }
    let start = p.start ?? input.from;
    if (p.start == null) {
      while (start + duration <= input.until && clash(start, start + duration)) start += 5;
    }
    if (start < input.from || start + duration > input.until || clash(start, start + duration)) {
      later.push(title);
      continue;
    }
    taken.push([start, start + duration]);
    tasks.push({
      title,
      start,
      duration,
      tone: TASK_TONES[tasks.length % TASK_TONES.length],
      icon: guessIcon(title),
      essential: ESSENTIAL.test(title),
    });
  }
  tasks.sort((a, b) => a.start - b.start);
  return { tasks, later, note: tr(low ? 'ai.fallbackNoteLow' : 'ai.fallbackNote'), source: 'simple' };
}

/* -------------------------------- Break down -------------------------------- */

export async function aiBreakDown(title: string, minutes?: number): Promise<{ steps: AiStep[]; source: AiPlan['source'] }> {
  if (smartModelReady() && DayflowAI) {
    try {
      const raw = JSON.parse(await DayflowAI.breakDown({ title, minutes, language: lang() })) as { steps: AiStep[] };
      const steps = (raw.steps ?? [])
        .filter((s) => s.title?.trim())
        .slice(0, 8)
        .map((s) => ({ title: s.title.trim().slice(0, 80), minutes: Math.min(60, Math.max(1, Math.round(s.minutes))) }));
      if (steps.length >= 2) return { steps, source: 'device' };
    } catch {
      // fall back below
    }
  }
  return { steps: simpleSteps(title, minutes ?? 25), source: 'simple' };
}

/** A generic but genuinely useful starter ladder when no model is available. */
function simpleSteps(title: string, total: number): AiStep[] {
  const work = Math.max(5, total - 2 - 3 - 5);
  return [
    { title: tr('ai.step1', { title }), minutes: 2 },
    { title: tr('ai.step2'), minutes: 3 },
    { title: tr('ai.step3'), minutes: Math.max(5, Math.round(work / 2)) },
    { title: tr('ai.step4'), minutes: Math.max(5, work - Math.round(work / 2)) },
    { title: tr('ai.step5'), minutes: 5 },
  ];
}
