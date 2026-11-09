import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMinutes, todayKey, useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { tr, useT } from '@/i18n';
import { CloudBuddy } from '@/components/CloudBuddy';
import { ActivityIcon } from '@/components/ActivityIcon';
import { collectNudges } from '@/services/nudges';
import type { Nudge } from '@/services/nudges';

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
};

type Colors = ReturnType<typeof useColors>;

/** Shared card layout: accent stripe · icon · kind label + time · title · message · actions. */
function NudgeCard({
  colors,
  accent,
  tint,
  icon,
  kind,
  meta,
  title,
  message,
  primary,
  secondary,
  tertiary,
}: {
  colors: Colors;
  accent: string;
  tint: string;
  icon: React.ReactNode;
  kind: string;
  meta?: string;
  title: string;
  message: string;
  primary?: { label: string; onPress: () => void; testID: string; icon?: keyof typeof Feather.glyphMap };
  secondary?: { label: string; onPress: () => void; testID: string; icon?: keyof typeof Feather.glyphMap };
  tertiary?: { label: string; onPress: () => void; testID: string };
}) {
  const press = (fn: () => void) => () => {
    void Haptics.selectionAsync();
    fn();
  };
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tint }]}>{icon}</View>
        <View style={styles.headText}>
          <View style={[styles.kindPill, { backgroundColor: tint }]}>
            <Text style={[styles.kind, { color: accent }]} numberOfLines={1}>
              {meta ? `${kind} · ${meta.toUpperCase()}` : kind}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
        </View>
      </View>

      {primary || secondary ? (
        <View style={styles.actions}>
          {primary ? (
            <Pressable
              accessibilityRole="button"
              onPress={press(primary.onPress)}
              testID={primary.testID}
              style={({ pressed }) => [styles.btn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
            >
              {primary.icon ? <Feather name={primary.icon} size={16} color="#FFFFFF" /> : null}
              <Text style={[styles.btnText, { color: '#FFFFFF' }]} numberOfLines={1}>{primary.label}</Text>
            </Pressable>
          ) : null}
          {secondary ? (
            <Pressable
              accessibilityRole="button"
              onPress={press(secondary.onPress)}
              testID={secondary.testID}
              style={({ pressed }) => [styles.btn, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}
            >
              {secondary.icon ? <Feather name={secondary.icon} size={16} color={accent} /> : null}
              <Text style={[styles.btnText, { color: accent }]} numberOfLines={1}>{secondary.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {tertiary ? (
        <Pressable accessibilityRole="button" onPress={press(tertiary.onPress)} testID={tertiary.testID} hitSlop={6} style={styles.link}>
          <Feather name="chevrons-right" size={14} color={colors.mutedForeground} />
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>{tertiary.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** One calm place for every gentle reminder — instead of cluttering Today. */
export default function NudgesScreen() {
  const colors = useColors();
  useT();
  const insets = useSafeAreaInsets();
  const {
    dayTasks, isSurvivalDay, extendTask, toggleDayTask, shiftRestOfDay,
    moveRolledOverToInbox, dismissRolloverBanner, endSurvivalDay,
  } = useDayflow();
  const [now, setNow] = useState(minutesNow);
  useEffect(() => {
    const id = setInterval(() => setNow(minutesNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const nudges = collectNudges(dayTasks, today, now, isSurvivalDay(today));
  const byId = new Map(dayTasks.map((t) => [t.id, t]));

  const renderNudge = (n: Nudge) => {
    if (n.kind === 'overrun') {
      const full = byId.get(n.task.id);
      const accent = full ? colors[`${full.tone}Ink` as const] : colors.apricotInk;
      return (
        <NudgeCard
          key={n.id}
          colors={colors}
          accent={accent}
          tint={full ? colors[full.tone] : colors.apricot}
          icon={full ? <ActivityIcon name={full.icon} size={22} color={accent} /> : <Feather name="clock" size={20} color={accent} />}
          kind={tr('nudges.kindOverrun')}
          meta={tr('nudges.ago', { count: n.over })}
          title={n.task.title}
          message={tr('nudges.overrunMsg')}
          primary={{ label: tr('nudges.extend'), testID: `nudge-extend-${n.task.id}`, onPress: () => extendTask(n.task.id, n.over + 10, true) }}
          secondary={{ label: tr('nudges.done'), icon: 'check', testID: `nudge-done-${n.task.id}`, onPress: () => toggleDayTask(n.task.id) }}
          tertiary={{ label: tr('nudges.shiftLong'), testID: `nudge-shift-${n.task.id}`, onPress: () => shiftRestOfDay(today, n.task.start + n.task.duration, 15) }}
        />
      );
    }
    if (n.kind === 'ready') {
      const full = byId.get(n.task.id);
      return (
        <NudgeCard
          key={n.id}
          colors={colors}
          accent={colors.apricotInk}
          tint={colors.apricot}
          icon={full ? <ActivityIcon name={full.icon} size={22} color={colors.apricotInk} /> : <Feather name="navigation" size={20} color={colors.apricotInk} />}
          kind={tr('nudges.kindReady')}
          meta={tr('nudges.inMin', { count: n.leaveIn })}
          title={n.task.title}
          message={tr('nudges.readyMsg', { time: formatMinutes(n.leave) })}
          primary={{ label: tr('nudges.readyOpen'), icon: 'play', testID: `nudge-open-${n.task.id}`, onPress: () => router.push({ pathname: '/focus', params: { taskId: n.task.id } }) }}
        />
      );
    }
    if (n.kind === 'carried') {
      return (
        <NudgeCard
          key={n.id}
          colors={colors}
          accent={colors.lemonInk}
          tint={colors.lemon}
          icon={<Feather name="sunrise" size={20} color={colors.lemonInk} />}
          kind={tr('nudges.kindCarried')}
          title={tr('nudges.carriedCount', { count: n.count })}
          message={tr('nudges.carriedMsg')}
          primary={{ label: tr('nudges.keep'), icon: 'check', testID: 'nudge-keep', onPress: dismissRolloverBanner }}
          secondary={{ label: tr('nudges.toInbox'), icon: 'inbox', testID: 'nudge-to-inbox', onPress: moveRolledOverToInbox }}
        />
      );
    }
    return (
      <NudgeCard
        key={n.id}
        colors={colors}
        accent={colors.roseInk}
        tint={colors.rose}
        icon={<MaterialCommunityIcons name="lifebuoy" size={22} color={colors.roseInk} />}
        kind={tr('nudges.kindSurvival')}
        title={tr('nudges.survivalCount', { count: n.count })}
        message={tr('nudges.survivalMsg')}
        secondary={{ label: tr('nudges.bringBack'), icon: 'rotate-ccw', testID: 'nudge-bring-back', onPress: () => endSurvivalDay(today) }}
      />
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>{tr('nudges.title')}</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            {nudges.length ? tr('nudges.badge', { count: nudges.length }) : tr('nudges.sub')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('common.close')}
          hitSlop={12}
          onPress={() => goBack()}
          testID="nudges-close"
          style={({ pressed }) => [styles.close, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {nudges.length ? (
          <View style={styles.list}>{nudges.map(renderNudge)}</View>
        ) : (
          <View style={styles.empty}>
            <CloudBuddy mood="happy" size={160} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr('nudges.emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{tr('nudges.emptyBody')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  pageTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  pageSub: { fontSize: 15, marginTop: 2 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  content: { paddingHorizontal: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  list: { gap: 14 },
  card: {
    borderRadius: 26,
    padding: 16,
    gap: 14,
    shadowColor: '#2A1F7A',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 4 },
  kindPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  kind: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.2 },
  message: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 16, paddingHorizontal: 12 },
  btnText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, paddingLeft: 2 },
  linkText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 6, paddingTop: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '800' },
  emptyBody: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
});
