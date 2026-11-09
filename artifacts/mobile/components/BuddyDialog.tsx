import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { tr } from '@/i18n';
import { CloudBuddy } from './CloudBuddy';
import type { BuddyMood } from './CloudBuddy';

/** Shared friendly dialog: cloud mascot, title, message, then actions (children). */
export function BuddyDialog({
  visible,
  mood,
  title,
  message,
  onClose,
  children,
}: {
  visible: boolean;
  mood: BuddyMood;
  title: string;
  message?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr('common.close')} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.card }]} accessibilityViewIsModal>
          <CloudBuddy mood={mood} size={150} />
          <Animated.View entering={reduce ? undefined : FadeInDown.duration(260)} style={styles.body}>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
            <View style={styles.actions}>{children}</View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export function DialogButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: React.ReactNode;
  testID?: string;
}) {
  const colors = useColors();
  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.muted : 'transparent';
  const fg = variant === 'primary' ? colors.primaryForeground : variant === 'secondary' ? colors.foreground : colors.mutedForeground;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        variant === 'text' ? styles.textBtn : styles.btn,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icon}
      <Text style={[variant === 'text' ? styles.textBtnLabel : styles.btnLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,27,58,0.35)' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    alignItems: 'center',
    borderRadius: 32,
    paddingTop: 22,
    paddingBottom: 14,
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
  message: { fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  actions: { width: '100%', gap: 8, marginTop: 10 },
  btn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 26, paddingHorizontal: 16 },
  btnLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  textBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 6 },
  textBtnLabel: { fontSize: 14, fontWeight: '600' },
});
