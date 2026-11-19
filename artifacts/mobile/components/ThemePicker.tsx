import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEMES, type AccentTheme } from '@/constants/themes';
import { useDayflow } from '@/context/DayflowContext';
import { usePro } from '@/context/ProContext';
import { useColors } from '@/hooks/useColors';
import { tr } from '@/i18n';
import { applyAppIcon } from '@/services/appIcon';

/** Pro accent themes, each with a matching app icon. Free users see them locked. */
export function ThemePicker({ bare = false }: { bare?: boolean } = {}) {
  const colors = useColors();
  const { theme, setTheme } = useDayflow();
  const { isPro, offerPro } = usePro();

  const pick = async (t: AccentTheme) => {
    if (t.id === theme) return;
    if (t.id !== 'violet' && !isPro) {
      const ok = await offerPro(tr('settings.themeTitle'), tr('settings.proThemesBody'), 'themes');
      if (!ok) return;
    }
    void Haptics.selectionAsync();
    setTheme(t.id);
    void applyAppIcon(t);
  };

  return (
    <View style={bare ? styles.bare : [styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.foreground }]}>{tr('settings.themeTitle')}</Text>
        {!isPro ? (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Feather name="star" size={11} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>PRO</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr('settings.themeSub')}</Text>
      <View style={styles.row}>
        {THEMES.map((t) => {
          const selected = t.id === theme;
          const locked = t.id !== 'violet' && !isPro;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={tr(`settings.theme_${t.id}`)}
              onPress={() => void pick(t)}
              testID={`theme-${t.id}`}
              style={styles.item}
            >
              <View style={[styles.ring, { borderColor: selected ? t.primary : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: t.primary }]}>
                  {selected ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
                  {locked ? <Feather name="lock" size={13} color="#FFFFFF" /> : null}
                </View>
              </View>
              <Text style={[styles.label, { color: selected ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                {tr(`settings.theme_${t.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 6 },
  bare: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 8 },
  item: { alignItems: 'center', width: 52, gap: 4 },
  ring: { borderWidth: 2, borderRadius: 999, padding: 3 },
  swatch: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Inter_500Medium', fontSize: 11 },
});
