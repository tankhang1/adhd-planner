import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { usePro } from '@/context/ProContext';
import { useColors } from '@/hooks/useColors';
import { tr } from '@/i18n';
import { readFlag, writeFlag } from '@/lib/storage';

export type FocusSound = 'off' | 'brown' | 'pink' | 'fan';

const SOURCES: Record<Exclude<FocusSound, 'off'>, number> = {
  brown: require('@/assets/sounds/brown.m4a'),
  pink: require('@/assets/sounds/pink.m4a'),
  fan: require('@/assets/sounds/fan.m4a'),
};

/** Brown noise is free so everyone can feel it work; the rest is Dayflow Pro. */
const FREE: FocusSound[] = ['off', 'brown'];
const ORDER: FocusSound[] = ['off', 'brown', 'pink', 'fan'];

/**
 * Focus room ambience: a looping background sound that plays while the timer runs.
 * Remembers the last choice. Mixes with other audio and respects the silent switch
 * being off (so it still plays, like a white-noise app).
 */
export function FocusSounds({ running, ink }: { running: boolean; ink: string }) {
  const colors = useColors();
  const { isPro, offerPro } = usePro();
  const [sound, setSound] = useState<FocusSound>(() => {
    const saved = (readFlag('focusSound') as FocusSound | null) ?? 'off';
    return ORDER.includes(saved) ? saved : 'off';
  });
  const active: FocusSound = !isPro && !FREE.includes(sound) ? 'off' : sound;
  const player = useAudioPlayer(active === 'off' ? null : SOURCES[active]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (active === 'off') return;
    player.loop = true;
    player.volume = 0.55;
    if (running) player.play();
    else player.pause();
  }, [player, active, running]);

  const pick = async (s: FocusSound) => {
    if (s === sound) return;
    if (!isPro && !FREE.includes(s)) {
      const ok = await offerPro(tr('focusSounds.proTitle'), tr('focusSounds.proBody'), 'focus_sounds');
      if (!ok) return;
    }
    void Haptics.selectionAsync();
    setSound(s);
    writeFlag('focusSound', s);
  };

  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={tr('focusSounds.label')}>
      <Feather name="headphones" size={15} color={colors.foreground} />
      {ORDER.map((s) => {
        const sel = s === active;
        const locked = !isPro && !FREE.includes(s);
        return (
          <Pressable
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ checked: sel }}
            accessibilityLabel={tr(`focusSounds.${s}`)}
            onPress={() => void pick(s)}
            testID={`focus-sound-${s}`}
            style={[styles.chip, { backgroundColor: sel ? ink : colors.card }]}
          >
            {locked ? <Feather name="lock" size={10} color={colors.mutedForeground} /> : null}
            <Text style={[styles.chipText, { color: sel ? '#FFFFFF' : colors.foreground }]}>{tr(`focusSounds.${s}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
