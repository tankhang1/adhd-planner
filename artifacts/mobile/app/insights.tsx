import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/lib/nav';
import { fromDateKey, insightFor, overallTendency, toDateKey, useDayflow } from '@/context/DayflowContext';
import type { EnergyLevel } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { formatDate, formatDuration, tr, useT } from '@/i18n';
import { mondayOf, summarizeWeek } from '@/services/weekly';

const WEEKS = 6;
const ENERGY_DAYS = 28;

/** Dayflow Pro: time learning, energy history and a multi-week look-back. */
export default function InsightsScreen() {
  useT();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { timeLog, energyLog, dayTasks, showUpDays } = useDayflow();

  const tendency = overallTendency(timeLog);
  const patterns = useMemo(
    () =>
      Array.from(new Set(timeLog.map((r) => r.title)))
        .map((title) => ({ title, ins: insightFor(timeLog, title) }))
        .filter((x): x is { title: string; ins: NonNullable<typeof x.ins> } => !!x.ins)
        .sort((a, b) => Math.abs(b.ins.ratio - 1) - Math.abs(a.ins.ratio - 1))
        .slice(0, 8),
    [timeLog],
  );

  const energyDays = useMemo(() => {
    const byDate = new Map(energyLog.map((e) => [e.date, e.level]));
    return Array.from({ length: ENERGY_DAYS }, (_, i) => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - (ENERGY_DAYS - 1 - i));
      const key = toDateKey(d);
      return { key, level: byDate.get(key) };
    });
  }, [energyLog]);
  const energyCounts = energyDays.reduce(
    (acc, d) => (d.level ? { ...acc, [d.level]: acc[d.level] + 1 } : acc),
    { low: 0, okay: 0, high: 0 } as Record<EnergyLevel, number>,
  );

  const weeks = useMemo(() => {
    return Array.from({ length: WEEKS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 7 * i);
      const monday = mondayOf(d);
      return { monday, s: summarizeWeek(monday, dayTasks, showUpDays, energyLog) };
    });
  }, [dayTasks, showUpDays, energyLog]);
  const maxDone = Math.max(1, ...weeks.map((w) => w.s.done));

  const energyColor = (l?: EnergyLevel) =>
    l === 'high' ? colors.sageInk : l === 'okay' ? colors.lemonInk : l === 'low' ? colors.apricotInk : colors.muted;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('common.close')} onPress={goBack} hitSlop={12} testID="insights-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>DAYFLOW PRO</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{tr('insights.title')}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr('insights.sub')}</Text>

        {/* Time learning */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{tr('insights.timeTitle')}</Text>
          {tendency ? (
            <Text style={[styles.big, { color: colors.primary }]}>
              {tendency.ratio > 1.1
                ? tr('settings.patternLonger', { pct: Math.round((tendency.ratio - 1) * 100) })
                : tendency.ratio < 0.9
                  ? tr('settings.patternFaster', { pct: Math.round((1 - tendency.ratio) * 100) })
                  : tr('settings.patternSpotOn')}
            </Text>
          ) : (
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{tr('settings.patternEmpty')}</Text>
          )}
          {patterns.map(({ title, ins }) => {
            const over = ins.typicalActual > ins.typicalPlanned;
            return (
              <View key={title} style={styles.row}>
                <Feather name={over ? 'trending-up' : 'trending-down'} size={15} color={over ? colors.apricotInk : colors.sageInk} />
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  {tr('settings.patternRow', { planned: ins.typicalPlanned, actual: ins.typicalActual })}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Energy history */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{tr('insights.energyTitle')}</Text>
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{tr('insights.energySub', { count: ENERGY_DAYS })}</Text>
          <View style={styles.grid}>
            {energyDays.map((d) => (
              <View
                key={d.key}
                accessibilityLabel={`${formatDate(fromDateKey(d.key), { month: 'short', day: 'numeric' })}: ${d.level ? tr(`insights.level_${d.level}`) : '–'}`}
                style={[styles.dot, { backgroundColor: energyColor(d.level), opacity: d.level ? 1 : 0.6 }]}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {(['high', 'okay', 'low'] as const).map((l) => (
              <View key={l} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: energyColor(l) }]} />
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  {tr(`insights.level_${l}`)} · {energyCounts[l]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Multi-week look-back */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{tr('insights.weeksTitle')}</Text>
          {weeks.map(({ monday, s }, i) => (
            <View key={monday} style={styles.weekRow}>
              <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>
                {i === 0 ? tr('insights.thisWeek') : formatDate(fromDateKey(monday), { month: 'short', day: 'numeric' })}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.bar, { width: `${(s.done / maxDone) * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.weekMeta, { color: colors.foreground }]}>
                {s.done} · {formatDuration(s.minutes)} · {tr('insights.days', { count: s.daysShownUp })}
              </Text>
            </View>
          ))}
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{tr('insights.weeksHint')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 20, alignItems: 'flex-end' },
  content: { paddingHorizontal: 20, gap: 14 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 4 },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  big: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  rowMeta: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 8 },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  weekRow: { gap: 4 },
  weekLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 999 },
  weekMeta: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});
