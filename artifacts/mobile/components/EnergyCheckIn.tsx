import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { isEssential, todayKey, useDayflow } from '@/context/DayflowContext';
import type { EnergyLevel } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { tr, useT } from '@/i18n';
import { CloudBuddy } from './CloudBuddy';
import type { BuddyMood } from './CloudBuddy';

const OPTIONS: Array<{ level: EnergyLevel; mood: BuddyMood; label: string; sub: string }> = [
  { level: 'low', mood: 'sleepy', label: 'energy.lowLabel', sub: 'energy.lowSub' },
  { level: 'okay', mood: 'okay', label: 'energy.okayLabel', sub: 'energy.okaySub' },
  { level: 'high', mood: 'happy', label: 'energy.highLabel', sub: 'energy.highSub' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? tr('energy.morning') : h < 18 ? tr('energy.hi') : tr('energy.evening');
};

/**
 * Morning check-in dialog. Opens by itself on the first visit of the day
 * (before 4 PM, once onboarding is done), or when `forceOpen` is set.
 */
export function EnergyCheckIn({ forceOpen, onClose, blocked }: { forceOpen?: boolean; onClose?: () => void; blocked?: boolean }) {
  const colors = useColors();
  useT();
  const reduce = useReducedMotion();
  const {
    hydrated, onboarded, energyFor, setEnergy, markEnergyHandled, startSurvivalDay, lightenDay, tasksFor,
    energyPromptDate, markEnergyPrompted,
  } = useDayflow();
  const date = todayKey();
  const [visible, setVisible] = useState(false);
  const [picked, setPicked] = useState<EnergyLevel | null>(null);

  // Auto-open once per day.
  useEffect(() => {
    if (!hydrated || !onboarded || blocked) return;
    if (energyPromptDate === date || energyFor(date) || new Date().getHours() >= 16) return;
    markEnergyPrompted(date);
    setVisible(true);
  }, [hydrated, onboarded, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (forceOpen) {
      setPicked(null);
      setVisible(true);
    }
  }, [forceOpen]);

  const close = () => {
    setVisible(false);
    setPicked(null);
    onClose?.();
  };

  const open = tasksFor(date).filter((t) => !t.done);
  const nonEssential = open.filter((t) => !isEssential(t));
  const longest = [...open].sort((a, b) => b.duration - a.duration)[0];

  const choose = (level: EnergyLevel) => {
    void Haptics.selectionAsync();
    setEnergy(date, level);
    setPicked(level);
    // Nothing to suggest → finish right away after a short beat.
    if (level === 'okay' || (level === 'low' && nonEssential.length === 0) || (level === 'high' && !longest)) {
      markEnergyHandled(date);
    }
  };

  const mood: BuddyMood = picked ? OPTIONS.find((o) => o.level === picked)!.mood : 'hello';
  const enter = reduce ? undefined : FadeInDown.duration(260);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={tr('energy.close')} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.card }]} accessibilityViewIsModal>
          <CloudBuddy mood={mood} size={150} />

          {!picked ? (
            <Animated.View entering={enter} exiting={reduce ? undefined : FadeOut} style={styles.body}>
              <Text style={[styles.title, { color: colors.foreground }]}>{greeting()}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{tr('energy.question')}</Text>
              <View style={styles.options}>
                {OPTIONS.map((o) => (
                  <Pressable
                    key={o.level}
                    accessibilityRole="button"
                    accessibilityLabel={`${tr(o.label)}. ${tr(o.sub)}`}
                    onPress={() => choose(o.level)}
                    testID={`energy-${o.level}`}
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: pressed ? colors.secondary : colors.muted },
                    ]}
                  >
                    <View style={styles.optionFace}>
                      <CloudBuddy mood={o.mood} size={52} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: colors.foreground }]}>{tr(o.label)}</Text>
                      <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{tr(o.sub)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <Pressable accessibilityRole="button" onPress={close} testID="energy-skip" style={styles.skip}>
                <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{tr('energy.skip')}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={reduce ? undefined : FadeIn.duration(240)} style={styles.body}>
              {picked === 'low' && nonEssential.length > 0 ? (
                <>
                  <Text style={[styles.title, { color: colors.foreground }]}>{tr('energy.lowTitle')}</Text>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    {tr('energy.lowMessage')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint={tr('energy.basicsHint')}
                    onPress={() => {
                      startSurvivalDay(date);
                      markEnergyHandled(date);
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      close();
                    }}
                    testID="survival-start"
                    style={[styles.primary, { backgroundColor: colors.primary }]}
                  >
                    <MaterialCommunityIcons name="lifebuoy" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{tr('energy.basics')}</Text>
                  </Pressable>
                  {nonEssential.length > 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        lightenDay(date, 2);
                        markEnergyHandled(date);
                        close();
                      }}
                      testID="lighten-day"
                      style={[styles.secondary, { backgroundColor: colors.muted }]}
                    >
                      <Text style={[styles.secondaryText, { color: colors.foreground }]}>
                        {tr('energy.keepTwo', { count: nonEssential.length - 2 })}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      markEnergyHandled(date);
                      close();
                    }}
                    testID="energy-keep"
                    style={styles.skip}
                  >
                    <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{tr('energy.keepPlan')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    {picked === 'high' ? tr('energy.highTitle') : picked === 'okay' ? tr('energy.okayTitle') : tr('energy.gentleTitle')}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    {picked === 'high' && longest
                      ? tr('energy.highMessage', { title: longest.title })
                      : picked === 'okay'
                        ? tr('energy.okayMessage')
                        : tr('energy.gentleMessage')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      markEnergyHandled(date);
                      close();
                    }}
                    testID="energy-done"
                    style={[styles.primary, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{tr('common.letsGo')}</Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,27,58,0.35)' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    alignItems: 'center',
    borderRadius: 32,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#2A1F7A',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  body: { width: '100%', alignItems: 'center', gap: 8, marginTop: 6 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320, marginBottom: 8 },
  options: { width: '100%', gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  optionFace: { width: 56, height: 46, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '700' },
  optionSub: { fontSize: 13, marginTop: 1 },
  primary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 27, marginTop: 6 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondary: { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: 25, paddingHorizontal: 16 },
  secondaryText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  skip: { paddingVertical: 10, paddingHorizontal: 16 },
  skipText: { fontSize: 14, fontWeight: '600' },
});
