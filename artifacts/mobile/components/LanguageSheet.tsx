import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow } from '@/context/DayflowContext';
import { LANGUAGES, deviceLanguage, useT } from '@/i18n';
import type { LanguageSetting } from '@/i18n';
import { useColors } from '@/hooks/useColors';

/** Bottom sheet to pick the app language. "Same as my phone" follows the device. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { language, setLanguage } = useDayflow();
  const phone = LANGUAGES.find((l) => l.code === deviceLanguage())!;

  const options: Array<{ value: LanguageSetting; title: string; sub?: string }> = [
    { value: 'system', title: t('languageSheet.system'), sub: t('languageSheet.systemSub', { name: phone.native }) },
    ...LANGUAGES.map((l) => ({ value: l.code as LanguageSetting, title: l.native, sub: l.native === l.english ? undefined : l.english })),
  ];

  const choose = (value: LanguageSetting) => {
    void Haptics.selectionAsync();
    setLanguage(value);
    setTimeout(onClose, 180); // let the checkmark land before closing
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.foreground }]}>{t('languageSheet.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('languageSheet.subtitle')}</Text>

        <View style={styles.list}>
          {options.map((o) => {
            const sel = o.value === language;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel }}
                onPress={() => choose(o.value)}
                testID={`language-${o.value}`}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: sel ? colors.secondary : pressed ? colors.muted : 'transparent' },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: sel ? colors.primary : colors.muted }]}>
                  {o.value === 'system' ? (
                    <Feather name="smartphone" size={16} color={sel ? colors.primaryForeground : colors.mutedForeground} />
                  ) : (
                    <Text style={[styles.code, { color: sel ? colors.primaryForeground : colors.mutedForeground }]}>
                      {o.value.toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{o.title}</Text>
                  {o.sub ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{o.sub}</Text> : null}
                </View>
                {sel ? <Feather name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,27,58,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 8 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 12, paddingHorizontal: 8 },
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, minHeight: 60, borderRadius: 18 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 12, fontWeight: '800' },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 1 },
});
