import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { fromDateKey } from '@/context/DayflowContext';

/**
 * Reads events from calendars already on the device. On iOS this includes
 * iCloud, Google and Outlook accounts added in Settings; on Android, any
 * account synced with the system calendar.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: number; // minutes since midnight
  duration: number;
  allDay: boolean;
  color?: string;
}

const supported = Platform.OS !== 'web';

export async function requestCalendarPermission(): Promise<boolean> {
  if (!supported) return false;
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  return granted;
}

async function fetchEvents(date: string): Promise<CalendarEvent[]> {
  const perm = await Calendar.getCalendarPermissionsAsync();
  if (!perm.granted) return [];
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (!calendars.length) return [];
  const colorById = new Map(calendars.map((c) => [c.id, c.color]));
  const dayStart = fromDateKey(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const events = await Calendar.getEventsAsync(calendars.map((c) => c.id), dayStart, dayEnd);

  return events.map((e) => {
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const startMin = s < dayStart ? 0 : s.getHours() * 60 + s.getMinutes();
    const endMin = en > dayEnd ? 24 * 60 : en.getHours() * 60 + en.getMinutes() || 24 * 60;
    return {
      id: `cal-${e.id}-${date}`,
      title: e.title || 'Busy',
      start: startMin,
      duration: Math.max(5, endMin - startMin),
      allDay: !!e.allDay,
      color: colorById.get(e.calendarId),
    };
  });
}

export function useCalendarEvents(date: string, enabled: boolean) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!supported || !enabled) {
      setEvents([]);
      return;
    }
    let active = true;
    const load = () =>
      fetchEvents(date)
        .then((list) => active && setEvents(list))
        .catch(() => active && setEvents([]));
    void load();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void load());
    return () => {
      active = false;
      sub.remove();
    };
  }, [date, enabled]);

  return events;
}
