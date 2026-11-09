import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { tr, useT } from '@/i18n';
import { CloudBuddy } from '@/components/CloudBuddy';

/**
 * Quick capture. Opened from the widget "+", Control Center, a Siri Shortcut,
 * or dayflow://capture?text=… (text is saved straight away).
 * Each line becomes its own Inbox item.
 */
export default function CaptureScreen() {
  const colors = useColors();
  useT();
  const insets = useSafeAreaInsets();
  const { text } = useLocalSearchParams<{ text?: string }>();
  const { addInboxTasks } = useDayflow();
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const handledParam = useRef(false);

  const lines = draft.split('\n').map((l) => l.trim()).filter(Boolean);

  const save = (items: string[]) => {
    if (!items.length) return;
    addInboxTasks(items);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(items.length);
    setDraft('');
    setTimeout(() => router.back(), 1100);
  };

  // Shortcut / Siri passed text in the link → save it immediately.
  useEffect(() => {
    if (handledParam.current || typeof text !== 'string' || !text.trim()) return;
    handledParam.current = true;
    save(text.split('\n'));
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8, paddingBottom: insets.bottom + 12 }]}
    >
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('common.close')} hitSlop={12} onPress={() => router.back()} testID="capture-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topLabel, { color: colors.foreground }]}>{tr('capture.label')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {saved !== null ? (
        <View style={styles.center}>
          <CloudBuddy mood="happy" size={160} />
          <Text style={[styles.title, { color: colors.foreground }]}>{tr('capture.saved')}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {saved === 1 ? tr('capture.savedOne') : tr('capture.savedMany', { count: saved })}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]}>{tr('capture.title')}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{tr('capture.sub')}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            multiline
            placeholder={tr('capture.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={tr('capture.inputA11y')}
            testID="capture-input"
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !lines.length }}
            disabled={!lines.length}
            onPress={() => save(lines)}
            testID="capture-save"
            style={({ pressed }) => [
              styles.save,
              { backgroundColor: colors.primary, opacity: !lines.length ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="inbox" size={18} color={colors.primaryForeground} />
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
              {lines.length > 1 ? tr('capture.saveMany', { count: lines.length }) : tr('capture.saveOne')}
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  top: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  body: { flex: 1, gap: 8, paddingTop: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 21 },
  input: { flex: 1, maxHeight: 280, minHeight: 160, marginTop: 10, padding: 16, borderRadius: 22, borderWidth: 1, fontSize: 17, lineHeight: 24, textAlignVertical: 'top' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, borderRadius: 28, marginTop: 12 },
  saveText: { fontSize: 16, fontWeight: '700' },
});
