import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/lib/nav';
import { formatMinutes, todayKey, useDayflow } from '@/context/DayflowContext';
import { usePro } from '@/context/ProContext';
import { useColors } from '@/hooks/useColors';
import { formatDuration, tr, useT } from '@/i18n';
import { CloudBuddy } from '@/components/CloudBuddy';
import { ActivityIcon } from '@/components/ActivityIcon';
import { AiError, aiPlanDay, type AiPlan } from '@/services/ai';
import { DayflowAI } from '@/modules/dayflow-ai';
import { Platform } from 'react-native';

const nowRounded = () => {
  const d = new Date();
  return Math.ceil((d.getHours() * 60 + d.getMinutes() + 5) / 15) * 15;
};

/** Dayflow Pro: brain-dump everything, get a gentle plan for the rest of today. */
export default function AiPlanScreen() {
  useT();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { inboxTasks, tasksFor, profile, energyFor, addDayTask, addInboxTask } = useDayflow();
  const { isPro, offerPro } = usePro();
  const today = todayKey();
  const [dump, setDump] = useState(() =>
    inboxTasks.filter((t) => !t.done).map((t) => t.title).join('\n'),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());

  const busy = useMemo(
    () => tasksFor(today).filter((t) => !t.done).map((t) => ({ start: t.start, duration: t.duration })),
    [tasksFor, today],
  );

  const run = async () => {
    if (!dump.trim() || loading) return;
    if (!isPro && !(await offerPro(tr('ai.proTitle'), tr('ai.proBody'), 'ai'))) return;
    setLoading(true);
    setError(null);
    try {
      const from = nowRounded();
      const sleep = profile?.sleep ?? 23 * 60;
      const until = Math.max(from + 30, Math.min(24 * 60, sleep > from ? sleep : 24 * 60));
      const result = await aiPlanDay({ dump, from, until, busy, energy: energyFor(today) });
      setPlan(result);
      setSkip(new Set());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unavailable';
      setError(tr(`ai.error_${code}`));
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!plan) return;
    plan.tasks.forEach((t, i) => {
      if (skip.has(i)) return;
      addDayTask({ title: t.title, start: t.start, duration: t.duration, tone: t.tone, icon: t.icon, essential: t.essential, date: today });
    });
    const inInbox = new Set(inboxTasks.map((t) => t.title.trim().toLowerCase()));
    plan.later.filter((l) => !inInbox.has(l.trim().toLowerCase())).forEach((l) => addInboxTask(l));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goBack();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('common.close')} onPress={goBack} hitSlop={12} testID="ai-plan-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <CloudBuddy mood={loading ? 'okay' : plan ? 'happy' : 'hello'} size={86} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{tr('ai.planTitle')}</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{plan ? plan.note : tr('ai.planSub')}</Text>
          </View>
        </View>

        {!plan ? (
          <>
            <TextInput
              value={dump}
              onChangeText={setDump}
              multiline
              placeholder={tr('ai.placeholder')}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={tr('ai.planTitle')}
              testID="ai-dump"
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            />
            <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
              <Feather name="lock" size={11} /> {tr('ai.privacy')}
            </Text>
          </>
        ) : (
          <View style={{ gap: 8 }}>
            {plan.tasks.map((t, i) => {
              const off = skip.has(i);
              return (
                <Pressable
                  key={`${t.title}-${i}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !off }}
                  onPress={() => setSkip((s) => {
                    const n = new Set(s);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  })}
                  testID={`ai-task-${i}`}
                  style={[styles.task, { backgroundColor: colors[t.tone], opacity: off ? 0.45 : 1 }]}
                >
                  <View style={[styles.taskIcon, { backgroundColor: colors.card }]}>
                    <ActivityIcon name={t.icon} size={19} color={colors[`${t.tone}Ink` as const]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={2}>{t.title}</Text>
                    <Text style={[styles.taskMeta, { color: colors.mutedForeground }]}>
                      {formatMinutes(t.start)} · {formatDuration(t.duration)}
                    </Text>
                  </View>
                  <Feather name={off ? 'circle' : 'check-circle'} size={20} color={colors[`${t.tone}Ink` as const]} />
                </Pressable>
              );
            })}
            {plan.source === 'simple' && Platform.OS === 'ios' && DayflowAI?.status() === 'notEnabled' ? (
              <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
                <Feather name="info" size={11} /> {tr('ai.simpleHint')}
              </Text>
            ) : null}
            {plan.later.length ? (
              <View style={[styles.later, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.laterTitle, { color: colors.mutedForeground }]}>{tr('ai.later')}</Text>
                {plan.later.map((l) => (
                  <Text key={l} style={[styles.laterItem, { color: colors.foreground }]}>• {l}</Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 14, backgroundColor: colors.background }]}>
        {plan ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => setPlan(null)} testID="ai-redo" style={[styles.secondary, { backgroundColor: colors.muted }]}>
              <Feather name="edit-2" size={16} color={colors.foreground} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={accept} testID="ai-accept" style={[styles.primary, { backgroundColor: colors.primary }]}>
              <Feather name="check" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                {tr('ai.addToToday', { count: plan.tasks.length - skip.size })}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!dump.trim() || loading}
            onPress={() => void run()}
            testID="ai-run"
            style={[styles.primary, { backgroundColor: colors.primary, opacity: !dump.trim() ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="zap" size={18} color={colors.primaryForeground} />}
            <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{loading ? tr('ai.thinking') : tr('ai.planIt')}</Text>
            {!isPro && !loading ? <Text style={[styles.pro, { color: colors.primaryForeground }]}>PRO</Text> : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 20, alignItems: 'flex-end' },
  content: { paddingHorizontal: 20, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20 },
  input: { minHeight: 200, borderRadius: 20, borderWidth: 1, padding: 16, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  privacy: { fontSize: 12, lineHeight: 16 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20 },
  taskIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 15, fontWeight: '700' },
  taskMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  later: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 4 },
  laterTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  laterItem: { fontSize: 14 },
  error: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 10 },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 27 },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondary: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  pro: { fontSize: 10, fontWeight: '800', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
});
