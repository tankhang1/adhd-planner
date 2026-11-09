import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { HexColor, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { STORAGE_KEY } from '@/context/DayflowContext';
import type { DayTask } from '@/context/DayflowContext';
import { buildWidgetPayload, currentAndNext } from '@/services/widgetData';
import { applyLanguage, formatClock, tr } from '@/i18n';
import type { LanguageSetting } from '@/i18n';
import type { WidgetTask } from '@/services/widgetData';

const INK = '#1F1B3A' as HexColor;
const MUTED = '#5E5A78' as HexColor;

const hhmm = (unix: number) => {
  const d = new Date(unix * 1000);
  return formatClock(d.getHours() * 60 + d.getMinutes());
};

function TodayWidget({ current, next, later }: { current: WidgetTask | null; next: WidgetTask | null; later: WidgetTask[] }) {
  const main = current ?? next;
  const bg = (main?.tone ?? '#FBFAFF') as HexColor;
  const ink = (main?.ink ?? '#1E9E62') as HexColor;
  const minsLeft = current ? Math.max(0, Math.ceil((current.end - Date.now() / 1000) / 60)) : 0;
  const progress = current ? Math.min(1, (Date.now() / 1000 - current.start) / (current.end - current.start)) : 0;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 24, padding: 16, flexDirection: 'row' }}
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget text={current ? tr('widget.now') : main ? tr('widget.next') : tr('widget.allClear')} style={{ fontSize: 11, fontWeight: '800', color: ink }} />
        <TextWidget
          text={main?.title ?? tr('widget.nothingElse')}
          maxLines={2}
          truncate="END"
          style={{ fontSize: 17, fontWeight: '700', color: INK, marginTop: 4 }}
        />
        <TextWidget
          text={current ? tr('widget.minLeft', { count: minsLeft }) : main ? tr('widget.at', { time: hhmm(main.start) }) : tr('widget.enjoy')}
          style={{ fontSize: 13, color: MUTED, marginTop: 4 }}
        />
        {current ? (
          <FlexWidget style={{ marginTop: 10, height: 6, width: 'match_parent', backgroundColor: '#FFFFFFB3', borderRadius: 3, flexDirection: 'row' }}>
            <FlexWidget style={{ height: 6, flex: Math.max(0.01, progress), backgroundColor: ink, borderRadius: 3 }} />
            <FlexWidget style={{ height: 6, flex: Math.max(0.01, 1 - progress) }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>

      {later.length ? (
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 14, justifyContent: 'center' }}>
          <TextWidget text={tr('widget.later')} style={{ fontSize: 11, fontWeight: '800', color: MUTED }} />
          {later.slice(0, 3).map((t) => (
            <FlexWidget key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.ink as HexColor, marginRight: 8 }} />
              <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                <TextWidget text={t.title} maxLines={1} truncate="END" style={{ fontSize: 12, fontWeight: '600', color: INK }} />
                <TextWidget text={hhmm(t.start)} style={{ fontSize: 10, color: MUTED }} />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/** Reads the saved plan (works in headless widget tasks too). */
export async function renderTodayWidget() {
  let tasks: DayTask[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as { dayTasks?: DayTask[]; language?: LanguageSetting }) : {};
    tasks = saved.dayTasks ?? [];
    // Headless widget task: the app isn't running, so apply the user's language here.
    applyLanguage(saved.language ?? 'system');
  } catch {}
  const payload = buildWidgetPayload(tasks);
  const { current, next } = currentAndNext(payload);
  const nowSec = Date.now() / 1000;
  const mainId = (current ?? next)?.id;
  const later = payload.tasks.filter((t) => !t.done && t.start > nowSec && t.id !== mainId);
  return <TodayWidget current={current} next={next} later={later} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await renderTodayWidget());
      break;
    default:
      break;
  }
}
