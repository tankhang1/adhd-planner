import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fromDateKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { formatDate, formatDuration, tr } from '@/i18n';
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

  const time = formatDuration(s.minutes);
  const best = s.bestDay ? formatDate(fromDateKey(s.bestDay), { weekday: 'long' }) : null;

  const title = s.done ? tr('weekly.title') : tr('weekly.titleEmpty');
  const message = s.done ? tr('weekly.message') : tr('weekly.messageEmpty');

  return (
    <BuddyDialog visible mood={s.done ? 'happy' : 'okay'} title={title} message={message} onClose={close}>
      {s.done ? (
        <View style={styles.stats}>
          {[
            { value: String(s.done), label: tr('weekly.statDone', { count: s.done }) },
            { value: time, label: tr('weekly.statEffort') },
            { value: String(s.daysShownUp), label: tr('weekly.statDays', { count: s.daysShownUp }) },
          ].map((x) => (
            <View key={x.label} style={[styles.stat, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{x.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{x.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.notes}>
        {best ? <Note text={tr('weekly.bestDay', { day: best })} /> : null}
        {s.lowEnergyDays ? (
          <Note text={tr('weekly.lowDays', { count: s.lowEnergyDays })} />
        ) : null}
        {s.oftenMoved[0] ? (
          <Note text={tr('weekly.oftenMoved', { title: s.oftenMoved[0] })} />
        ) : null}
      </View>

      <DialogButton label={tr('weekly.onward')} testID="weekly-close" onPress={close} />
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
