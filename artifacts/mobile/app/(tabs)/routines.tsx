import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BodyText, Page, PageTitle, ProgressBar, SectionHeading } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import type { Routine } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { formatDuration, tr, useT } from '@/i18n';
import { ActivityIcon } from '@/components/ActivityIcon';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const SPRING = { damping: 18, stiffness: 220 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { usePro } from '@/context/ProContext';
import { FREE_ROUTINES } from '@/lib/limits';

/** Compact routine row: tap to peek at the steps, ▶ to start. Locked rows open the paywall. */
function RoutineCard({ routine, locked }: { routine: Routine; locked: boolean }) {
  const colors = useColors();
  const { offerPro } = usePro();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const ink = colors[`${routine.tone}Ink` as const];
  // Gentle press-in on the card and the play button, and a rotating chevron.
  const cardScale = useSharedValue(1);
  const playScale = useSharedValue(1);
  const chevron = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }));
  const press = (v: typeof cardScale, to: number) => {
    if (!reduce) v.value = withSpring(to, SPRING);
  };
  const completed = routine.steps.filter((s) => s.done).length;
  const minutes = routine.steps.reduce((sum, s) => sum + s.duration, 0);
  const inProgress = completed > 0 && completed < routine.steps.length;

  const start = async () => {
    if (locked && !(await offerPro(tr('settings.proRoutinesTitle'), tr('settings.proRoutinesBody', { count: FREE_ROUTINES }), 'routines'))) return;
    void Haptics.selectionAsync();
    router.push({ pathname: '/routine-run', params: { id: routine.id } });
  };

  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.springify().damping(20).stiffness(200)}
      style={[styles.card, { backgroundColor: colors[routine.tone] }, cardStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPressIn={() => press(cardScale, 0.98)}
        onPressOut={() => press(cardScale, 1)}
        accessibilityLabel={`${routine.title}, ${tr('routines.meta', { steps: routine.steps.length, time: formatDuration(minutes) })}`}
        onPress={() => {
          void Haptics.selectionAsync();
          const next = !open;
          setOpen(next);
          chevron.value = reduce ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: 220 });
        }}
        testID={`routine-card-${routine.id}`}
        style={styles.cardTop}
      >
        <View style={[styles.icon, { backgroundColor: colors.card }]}>
          <ActivityIcon name={routine.icon} size={22} color={ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{routine.title}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {inProgress
              ? tr('routines.progress', { done: completed, total: routine.steps.length })
              : tr('routines.meta', { steps: routine.steps.length, time: formatDuration(minutes) })}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Animated.View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${inProgress ? tr('routines.continue') : tr('routines.start')}: ${routine.title}`}
          onPress={() => void start()}
          onPressIn={() => press(playScale, 0.88)}
          onPressOut={() => press(playScale, 1)}
          hitSlop={6}
          testID={`routine-start-${routine.id}`}
          style={[styles.play, { backgroundColor: locked ? colors.mutedForeground : ink }, playStyle]}
        >
          <Feather name={locked ? 'lock' : 'play'} size={locked ? 15 : 17} color="#FFFFFF" style={locked ? undefined : { marginLeft: 2 }} />
        </AnimatedPressable>
      </Pressable>

      {inProgress ? <ProgressBar value={completed / routine.steps.length} color={ink} /> : null}

      {open ? (
        <Animated.View
          entering={reduce ? undefined : FadeIn.duration(220).delay(60)}
          exiting={reduce ? undefined : FadeOut.duration(140)}
          style={styles.steps}
        >
          {routine.steps.map((s, i) => (
            <View key={s.id} style={styles.stepRow}>
              <View style={[styles.num, { backgroundColor: s.done ? ink : colors.card }]}>
                {s.done ? <Feather name="check" size={11} color="#FFFFFF" /> : <Text style={[styles.numText, { color: ink }]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }, s.done && styles.stepDone]} numberOfLines={1}>{s.title}</Text>
              <Text style={[styles.stepDur, { color: colors.mutedForeground }]}>{s.duration}m</Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('routines.edit', { title: routine.title })}
            onPress={() => router.push({ pathname: '/routine-edit', params: { id: routine.id } })}
            testID={`routine-edit-${routine.id}`}
            style={({ pressed }) => [styles.editRow, { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            <Text style={[styles.editText, { color: colors.foreground }]}>{tr('routines.editShort')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const TREAT_MINUTES = [3, 5, 10, 15];

/** The "dopamine menu": small, enjoyable things that recharge you. */
function JoyList() {
  const colors = useColors();
  const { treats, addTreat, removeTreat } = useDayflow();
  const [draft, setDraft] = useState('');
  const [minutes, setMinutes] = useState(5);

  const add = () => {
    if (!draft.trim()) return;
    addTreat(draft, minutes, 'emoticon-happy');
    setDraft('');
    void Haptics.selectionAsync();
  };

  return (
    <View style={styles.joy}>
      <SectionHeading
        title={tr('routines.joyTitle')}
        subtitle={tr('routines.joySub')}
      />
      <View style={styles.joyChips}>
        {treats.map((t) => (
          <View key={t.id} style={[styles.joyChip, { backgroundColor: colors.lemon }]}>
            <ActivityIcon name={t.icon} size={16} color={colors.lemonInk} />
            <Text style={[styles.joyText, { color: colors.foreground }]} numberOfLines={1}>{t.title}</Text>
            <Text style={[styles.joyMin, { color: colors.mutedForeground }]}>{tr('common.minutes', { count: t.minutes })}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('routines.joyRemove', { title: t.title })}
              hitSlop={8}
              onPress={() => removeTreat(t.id)}
              testID={`treat-remove-${t.id}`}
            >
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={[styles.joyAdd, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder={tr('routines.joyPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel={tr('routines.joyAdd')}
          testID="treat-input"
          style={[styles.joyInput, { color: colors.foreground }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('routines.joyLength', { count: minutes })}
          onPress={() => setMinutes((m) => TREAT_MINUTES[(TREAT_MINUTES.indexOf(m) + 1) % TREAT_MINUTES.length])}
          style={[styles.joyLen, { backgroundColor: colors.muted }]}
          testID="treat-minutes"
        >
          <Text style={[styles.joyMin, { color: colors.foreground }]}>{tr('common.minutes', { count: minutes })}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('routines.add')}
          disabled={!draft.trim()}
          onPress={add}
          testID="treat-add"
          style={[styles.joyBtn, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.4 }]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function RoutinesScreen() {
  useT();
  const { routines } = useDayflow();
  const { isPro, offerPro } = usePro();
  const colors = useColors();
  const newRoutine = async () => {
    if (!isPro && routines.length >= FREE_ROUTINES) {
      const ok = await offerPro(tr('settings.proRoutinesTitle'), tr('settings.proRoutinesBody', { count: FREE_ROUTINES }), 'routines');
      if (!ok) return;
    }
    router.push('/routine-edit');
  };
  const atLimit = !isPro && routines.length >= FREE_ROUTINES;
  const reduceMotion = useReducedMotion();
  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <PageTitle>{tr('routines.title')}</PageTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('routines.newRoutine')}
            onPress={() => void newRoutine()}
            hitSlop={8}
            testID="new-routine"
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
            {atLimit ? (
              <View style={[styles.addLock, { backgroundColor: colors.card }]}>
                <Feather name="lock" size={9} color={colors.primary} />
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={styles.subRow}>
          <BodyText style={styles.headerCopy}>{tr('routines.intro')}</BodyText>
        </View>
        {!isPro ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void offerPro(tr('settings.proRoutinesTitle'), tr('settings.proRoutinesBody', { count: FREE_ROUTINES }), 'routines')}
            testID="routines-limit"
            style={[styles.limitPill, { backgroundColor: colors.secondary }]}
          >
            <Feather name={atLimit ? 'lock' : 'layers'} size={12} color={colors.secondaryForeground} />
            <Text style={[styles.limitText, { color: colors.secondaryForeground }]}>
              {tr('routines.freeCount', { used: Math.min(routines.length, FREE_ROUTINES), max: FREE_ROUTINES })}
            </Text>
            <Text style={[styles.limitPro, { color: colors.primary }]}>PRO ›</Text>
          </Pressable>
        ) : null}
      </View>

      {routines.length ? (
        routines.map((r, i) => (
          <Animated.View
            key={r.id}
            entering={reduceMotion ? undefined : FadeIn.duration(260).delay(i * 50)}
            layout={reduceMotion ? undefined : LinearTransition.springify().damping(20).stiffness(200)}
          >
            <RoutineCard routine={r} locked={!isPro && i >= FREE_ROUTINES} />
          </Animated.View>
        ))
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void newRoutine()}
          testID="routines-empty"
          style={({ pressed }) => [styles.empty, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="sun" size={22} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{tr('routines.emptyTitle')}</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{tr('routines.emptyBody')}</Text>
        </Pressable>
      )}

      <JoyList />

      <View style={[styles.reassurance, { backgroundColor: colors.secondary }]}>
        <Feather name="heart" size={16} color={colors.primary} />
        <Text style={[styles.reassuranceText, { color: colors.secondaryForeground }]}>
          {tr('routines.reassure')}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subRow: { flexDirection: 'row' },
  headerCopy: { maxWidth: 350, fontSize: 14, lineHeight: 20 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addLock: { position: 'absolute', right: -2, top: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  limitPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
  limitText: { fontSize: 12, fontWeight: '700' },
  limitPro: { fontSize: 11, fontWeight: '800' },
  card: { borderRadius: 22, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  meta: { fontSize: 12, fontWeight: '600' },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  steps: { gap: 8, paddingTop: 2, paddingHorizontal: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 19, marginTop: 4 },
  editText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 6, padding: 24, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyBody: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  joy: { gap: 12, marginTop: 6 },
  joyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  joyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 10, height: 36, borderRadius: 18, maxWidth: '100%' },
  joyText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  joyMin: { fontSize: 12, fontWeight: '700' },
  joyAdd: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 6, height: 52, borderRadius: 26, borderWidth: 1 },
  joyInput: { flex: 1, fontSize: 15 },
  joyLen: { height: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  joyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, fontWeight: '500' },
  stepDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  stepDur: { fontSize: 12, fontWeight: '600' },
  reassurance: { minHeight: 52, borderRadius: 17, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reassuranceText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
});
