import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fromDateKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { summarizeWeek } from '@/services/weekly';
import { BuddyDialog, DialogButton } from './BuddyDialog';

/** A two-minute, judgement-free look back at the week. Never scores you. */
export function WeeklyReview({ monday, onClose }: { monday: string; onClose: () => void }) {
  const colors = useColors();
  const { dayTasks, showUpDays, energyLog, markWeekReviewed } = useDayflow();
  const s = useMemo(() => summarizeWeek(monday, dayTasks, showUpDays, energyLog), [monday, dayTasks, showUpDays, energyLog]);

  const close = () => {
    markWeekReviewed(monday);
    onClose();
  };

  const hours = Math.floor(s.minutes / 60);
  const time = hours ? `${hours}h ${s.minutes % 60}m` : `${s.minutes}m`;
  const best = s.bestDay ? fromDateKey(s.bestDay).toLocaleDateString('en-US', { weekday: 'long' }) : null;

  const title = s.done ? 'Look at your week' : 'A new week is coming';
  const message = s.done
    ? 'No scores, no streaks — just a look back at what you did.'
    : 'Some weeks are about getting through. That counts too.';

  return (
    <BuddyDialog visible mood={s.done ? 'happy' : 'okay'} title={title} message={message} onClose={close}>
      {s.done ? (
        <View style={styles.stats}>
          {[
            { value: String(s.done), label: s.done === 1 ? 'thing done' : 'things done' },
            { value: time, label: 'of effort' },
            { value: String(s.daysShownUp), label: s.daysShownUp === 1 ? 'day you showed up' : 'days you showed up' },
          ].map((x) => (
            <View key={x.label} style={[styles.stat, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{x.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{x.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.notes}>
        {best ? <Note text={`${best} was your strongest day.`} /> : null}
        {s.lowEnergyDays ? (
          <Note text={`You had ${s.lowEnergyDays} low-battery ${s.lowEnergyDays === 1 ? 'day' : 'days'} and kept going anyway.`} />
        ) : null}
        {s.oftenMoved[0] ? (
          <Note text={`“${s.oftenMoved[0]}” keeps getting moved. Maybe start with a tiny first step next week?`} />
        ) : null}
      </View>

      <DialogButton label="Onward to next week" testID="weekly-close" onPress={close} />
    </BuddyDialog>
  );
}

function Note({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.note}>
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.noteText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  notes: { gap: 8, marginVertical: 4 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
