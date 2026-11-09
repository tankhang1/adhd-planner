import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMinutes, useDayflow } from '@/context/DayflowContext';
import type { Struggle } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

const STRUGGLES: Array<{ key: Struggle; title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'starting', title: 'Getting started', subtitle: 'I know what to do, I just can’t begin', icon: 'play-circle' },
  { key: 'time', title: 'Losing track of time', subtitle: 'I’m often late or misjudge how long things take', icon: 'clock' },
  { key: 'hyperfocus', title: 'Getting stuck', subtitle: 'I hyperfocus and forget everything else', icon: 'target' },
  { key: 'overwhelm', title: 'Feeling overwhelmed', subtitle: 'Too many things, I don’t know where to start', icon: 'cloud' },
];

function TimeStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const colors = useColors();
  const btn = (delta: number, icon: 'minus' | 'plus') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${delta > 0 ? 'later' : 'earlier'}`}
      onPress={() => {
        void Haptics.selectionAsync();
        onChange((value + delta + 24 * 60) % (24 * 60));
      }}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={22} color={colors.secondaryForeground} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {btn(-15, 'minus')}
      <Text style={[styles.stepValue, { color: colors.foreground }]} accessibilityLiveRegion="polite">
        {formatMinutes(value)}
      </Text>
      {btn(15, 'plus')}
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useDayflow();
  const [step, setStep] = useState(0);
  const [wake, setWake] = useState(7 * 60 + 30);
  const [sleep, setSleep] = useState(23 * 60);
  const [struggle, setStruggle] = useState<Struggle | null>(null);

  const steps = [
    {
      eyebrow: 'QUESTION 1 OF 3',
      title: 'When do you usually wake up?',
      body: <TimeStepper value={wake} onChange={setWake} label="Wake time" />,
      ready: true,
    },
    {
      eyebrow: 'QUESTION 2 OF 3',
      title: 'And when do you go to bed?',
      body: <TimeStepper value={sleep} onChange={setSleep} label="Bed time" />,
      ready: true,
    },
    {
      eyebrow: 'QUESTION 3 OF 3',
      title: 'What’s hardest for you?',
      body: (
        <View style={{ gap: 10 }}>
          {STRUGGLES.map((s) => {
            const sel = struggle === s.key;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStruggle(s.key);
                }}
                testID={`struggle-${s.key}`}
                style={[
                  styles.option,
                  { backgroundColor: sel ? colors.secondary : colors.card, borderColor: sel ? colors.primary : colors.border },
                ]}
              >
                <View style={[styles.optionIcon, { backgroundColor: sel ? colors.primary : colors.muted }]}>
                  <Feather name={s.icon} size={18} color={sel ? colors.primaryForeground : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{s.title}</Text>
                  <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{s.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ),
      ready: !!struggle,
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  const next = () => {
    if (!current.ready) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    completeOnboarding({ wake, sleep, struggle: struggle ?? 'overwhelm' });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.border, flex: 1 }]} />
        ))}
      </View>

      <View style={styles.body}>
        {step === 0 ? (
          <View style={[styles.hero, { backgroundColor: colors.lilac }]}>
            <Feather name="sunrise" size={30} color={colors.lilacInk} />
            <Text style={[styles.heroText, { color: colors.foreground }]}>
              Three quick questions and we’ll sketch a gentle first day for you.
            </Text>
          </View>
        ) : null}
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{current.eyebrow}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{current.title}</Text>
        {current.body}
      </View>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setStep(step - 1)} style={styles.back} testID="onboarding-back">
            <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : <View />}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !current.ready }}
          disabled={!current.ready}
          onPress={next}
          testID="onboarding-next"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary, opacity: !current.ready ? 0.4 : pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>{last ? 'Build my day' : 'Next'}</Text>
          <Feather name={last ? 'check' : 'arrow-right'} size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 22 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 5, borderRadius: 3 },
  body: { flex: 1, gap: 14, paddingTop: 28, maxWidth: 520, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, marginBottom: 10 },
  heroText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 24, borderWidth: 1 },
  stepBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5 },
  optionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 13, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, minHeight: 54, borderRadius: 27 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
