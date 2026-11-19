// Turns one typed line into an activity: "gym 6pm 45m" → { title: 'gym', start: 1080, duration: 45 }.
// Pure (no React Native deps) so it can be unit-tested. Understands common English, German,
// Japanese, Korean and Vietnamese shorthands; anything it doesn't recognise stays in the title.

export interface QuickParse {
  title: string;
  /** Minutes after midnight, if a time was found. */
  start: number | null;
  /** Minutes, if a duration was found. */
  duration: number | null;
  /** 0 = today, 1 = tomorrow. */
  dayOffset: 0 | 1;
  /** Weekdays (0 = Sunday) to repeat on, for habits typed like "meds 8am every day". */
  repeatDays: number[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Durations: 45m, 45 min, 1h, 1h30, 1.5h, 90 mins, 45p, 45 phút, 2 giờ, 30分, 1時間, 30분, 1시간, 45 Min., 1 Std. */
const DURATION = [
  // 1h30 / 1h 30m / 1 hr 30 min
  /(?:^|\s)(?:for\s+)?(\d{1,2})\s*(?:h|hr|hrs|hour|hours|std\.?|stunden?|giờ|tiếng|時間|시간)\s*(\d{1,2})\s*(?:m|min|mins|minutes?|p|phút|分|분)?(?=\s|$)/i,
  // 1.5h
  /(?:^|\s)(?:for\s+)?(\d{1,2}[.,]\d)\s*(?:h|hr|hrs|hours?|std\.?|stunden?|giờ|tiếng|時間|시간)(?=\s|$)/i,
  // 2h
  /(?:^|\s)(?:for\s+)?(\d{1,2})\s*(?:h|hr|hrs|hours?|std\.?|stunden?|giờ\s*đồng\s*hồ|tiếng|時間|시간)(?=\s|$)/i,
  // 45m
  /(?:^|\s)(?:for\s+)?(\d{1,3})\s*(?:m|min\.?|mins|minutes?|minuten?|p|phút|分間?|분)(?=\s|$)/i,
];

/** Times: 6pm, 6:30pm, 18:00, 18h, 18h30, at 6, um 18 Uhr, 18時, 18時半, 오후 6시, 6시 30분, lúc 6h chiều */
function findTime(text: string): { start: number; match: string } | null {
  const tests: Array<[RegExp, (m: RegExpMatchArray) => number | null]> = [
    // Korean: 오후 6시 30분 / 6시
    [/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/, (m) => {
      let h = Number(m[2]);
      if (m[1] === '오후' && h < 12) h += 12;
      if (m[1] === '오전' && h === 12) h = 0;
      return h * 60 + (m[0].includes('반') ? 30 : Number(m[3] ?? 0));
    }],
    // Japanese: 午後6時30分 / 18時半
    [/(午前|午後)?\s*(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分|半)?/, (m) => {
      let h = Number(m[2]);
      if (m[1] === '午後' && h < 12) h += 12;
      return h * 60 + (m[0].includes('半') ? 30 : Number(m[3] ?? 0));
    }],
    // 6:30pm / 6pm / 6 pm / 6.30am
    [/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\s|$|[,.])/i, (m) => {
      let h = Number(m[1]) % 12;
      if (m[3].toLowerCase().startsWith('p')) h += 12;
      return h * 60 + Number(m[2] ?? 0);
    }],
    // 18:00 / 9:15
    [/\b(\d{1,2}):(\d{2})\b/, (m) => Number(m[1]) * 60 + Number(m[2])],
    // Vietnamese: lúc 6h chiều / 18h30 / 7h sáng
    [/(?:lúc\s*)?\b(\d{1,2})h(\d{2})?(?:\s*(sáng|trưa|chiều|tối))?(?=\s|$)/i, (m) => {
      let h = Number(m[1]);
      if (m[3] && /chiều|tối/i.test(m[3]) && h < 12) h += 12;
      return h * 60 + Number(m[2] ?? 0);
    }],
    // at 6 / um 18 Uhr / 18 Uhr
    [/(?:\b(?:at|um)\s+(\d{1,2})(?:\s*uhr)?|\b(\d{1,2})\s*uhr)(?=\s|$)/i, (m) => {
      let h = Number(m[1] ?? m[2]);
      // "at 6" with no am/pm: assume the next sensible daytime hour.
      if (m[1] && h >= 1 && h <= 7) h += 12;
      return h * 60;
    }],
  ];
  for (const [re, toMin] of tests) {
    const m = text.match(re);
    if (!m) continue;
    const start = toMin(m);
    if (start == null || start < 0 || start >= 24 * 60) continue;
    return { start, match: m[0] };
  }
  return null;
}

const DAILY = /(?:^|\s)(every ?day|daily|each day|jeden tag|täglich|mỗi ngày|hằng ngày|hàng ngày|毎日|매일)(?=\s|$)/i;
const WEEKDAYS = /(?:^|\s)(weekdays|every weekday|werktags|ngày thường|các ngày trong tuần|平日|평일)(?=\s|$)/i;
const WEEKENDS = /(?:^|\s)(weekends|every weekend|am wochenende|cuối tuần|週末|주말)(?=\s|$)/i;

const TOMORROW = /(?:^|\s)(tomorrow|tmr|morgen|明日|あした|내일|ngày mai)(?=\s|$)/i;
const TODAY = /(?:^|\s)(today|heute|今日|きょう|오늘|hôm nay)(?=\s|$)/i;

export function parseQuickAdd(input: string): QuickParse {
  let text = ` ${input.trim()} `;
  let dayOffset: 0 | 1 = 0;

  let repeatDays: number[] = [];
  for (const [re, days] of [[DAILY, [0, 1, 2, 3, 4, 5, 6]], [WEEKDAYS, [1, 2, 3, 4, 5]], [WEEKENDS, [0, 6]]] as const) {
    const m = text.match(re);
    if (m) {
      repeatDays = [...days];
      text = text.replace(m[0], ' ');
      break;
    }
  }

  const tm = text.match(TOMORROW);
  if (tm) {
    dayOffset = 1;
    text = text.replace(tm[0], ' ');
  }
  const td = text.match(TODAY);
  if (td) text = text.replace(td[0], ' ');

  let duration: number | null = null;
  outer: for (const [i, re] of DURATION.entries()) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags + 'g'))) {
      // "18h", "18h30", "7h sáng" are clock times in Vietnamese/French style, not durations.
      const plainH = i !== 3 && /\d\s*h(?:\d|\s|$)/i.test(m[0]);
      const before = text.slice(0, m.index);
      const after = text.slice((m.index ?? 0) + m[0].length);
      if (plainH && (Number(m[1]) > 12 || /^\s*(sáng|trưa|chiều|tối)/i.test(after) || /lúc\s*$/i.test(before))) continue;
      if (i === 0) duration = Number(m[1]) * 60 + Number(m[2]);
      else if (i === 1) duration = Math.round(parseFloat(m[1].replace(',', '.')) * 60);
      else if (i === 2) duration = Number(m[1]) * 60;
      else duration = Number(m[1]);
      text = before + ' ' + after;
      break outer;
    }
  }

  const time = findTime(text);
  if (time) text = text.replace(time.match, ' ');

  const title = text
    .replace(/\s+(at|um|lúc|for|für)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title,
    start: time ? Math.round(time.start / 5) * 5 : null,
    duration: duration ? clamp(Math.round(duration / 5) * 5 || 5, 5, 12 * 60) : null,
    dayOffset,
    repeatDays,
  };
}
