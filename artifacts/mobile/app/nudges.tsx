import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

  const Btn = ({ label, onPress, primary, testID }: { label: string; onPress: () => void; primary?: boolean; testID: string }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: primary ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.btnText, { color: primary ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  const renderNudge = (n: Nudge) => {
    if (n.kind === 'overrun') {
      const full = byId.get(n.task.id);
      const ink = full ? colors[`${full.tone}Ink` as const] : colors.primary;
      return (
        <View key={n.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: full ? colors[full.tone] : colors.muted }]}>
              {full ? <ActivityIcon name={full.icon} size={20} color={ink} /> : <Feather name="clock" size={18} color={ink} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{tr('nudges.overrunTitle', { title: n.task.title })}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>{tr('nudges.overrunBody', { count: n.over })}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Btn primary label={tr('nudges.extend')} testID={`nudge-extend-${n.task.id}`} onPress={() => extendTask(n.task.id, n.over + 10, true)} />
            <Btn label={tr('nudges.done')} testID={`nudge-done-${n.task.id}`} onPress={() => toggleDayTask(n.task.id)} />
            <Btn label={tr('nudges.shift')} testID={`nudge-shift-${n.task.id}`} onPress={() => shiftRestOfDay(today, n.task.start + n.task.duration, 15)} />
          </View>
        </View>
      );
    }
    if (n.kind === 'ready') {
      return (
        <View key={n.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: colors.apricot }]}>
              <Feather name="navigation" size={18} color={colors.apricotInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{tr('nudges.readyTitle', { title: n.task.title })}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {tr('nudges.readyBody', { time: formatMinutes(n.leave), count: n.leaveIn })}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Btn primary label={tr('nudges.readyOpen')} testID={`nudge-open-${n.task.id}`} onPress={() => router.push({ pathname: '/focus', params: { taskId: n.task.id } })} />
          </View>
        </View>
      );
    }
    if (n.kind === 'carried') {
      return (
        <View key={n.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: colors.lemon }]}>
              <Feather name="sunrise" size={18} color={colors.lemonInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{tr('nudges.carriedTitle')}</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>{tr('nudges.carriedBody', { count: n.count })}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Btn primary label={tr('nudges.keep')} testID="nudge-keep" onPress={dismissRolloverBanner} />
            <Btn label={tr('nudges.toInbox')} testID="nudge-to-inbox" onPress={moveRolledOverToInbox} />
          </View>
        </View>
      );
    }
    return (
      <View key={n.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.head}>
          <View style={[styles.icon, { backgroundColor: colors.rose }]}>
            <MaterialCommunityIcons name="lifebuoy" size={20} color={colors.roseInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{tr('nudges.survivalTitle')}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{tr('nudges.survivalBody', { count: n.count })}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Btn label={tr('nudges.bringBack')} testID="nudge-bring-back" onPress={() => endSurvivalDay(today)} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('common.close')} hitSlop={12} onPress={() => router.back()} testID="nudges-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>{tr('nudges.title')}</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>{tr('nudges.sub')}</Text>

        {nudges.length ? (
          <View style={styles.list}>{nudges.map(renderNudge)}</View>
        ) : (
          <View style={styles.empty}>
            <CloudBuddy mood="happy" size={150} />
            <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>{tr('nudges.emptyTitle')}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground, textAlign: 'center' }]}>{tr('nudges.emptyBody')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  content: { paddingHorizontal: 20, gap: 6, maxWidth: 600, width: '100%', alignSelf: 'center' },
  pageTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  pageSub: { fontSize: 15, marginBottom: 14 },
  list: { gap: 12 },
  card: { padding: 16, borderRadius: 22, borderWidth: 1, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  body: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { paddingHorizontal: 16, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 8, paddingTop: 40 },
});
