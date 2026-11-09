import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PressableProps, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import type { ReactNode } from 'react';

export function Page({ children }: { children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageContent,
          {
            paddingTop: web ? 83 : Math.max(insets.top, 16),
            paddingBottom: web ? 110 : Math.max(insets.bottom, 24) + 88,
          },
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.eyebrow, { color: color ?? colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.pageTitle, { color: colors.foreground }]}>{children}</Text>;
}

export function BodyText({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  const colors = useColors();
  return (
    <Text style={[styles.bodyText, { color: color ?? colors.mutedForeground }, style]}>
      {children}
    </Text>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <BodyText style={styles.sectionSubtitle}>{subtitle}</BodyText> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  ...props
}: Omit<PressableProps, 'children'> & {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      {...props}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      testID={props.testID ?? `icon-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.secondary, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <Feather name={icon} size={18} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  icon,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={17} color={colors.primaryForeground} /> : null}
      <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(value, 1));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.progressTrack, { backgroundColor: colors.muted }]}
    >
      <View
        style={[
          styles.progressFill,
          { width: `${clamped * 100}%`, backgroundColor: color ?? colors.primary },
        ]}
      />
    </View>
  );
}

export function Tag({
  children,
  background,
  foreground,
}: {
  children: ReactNode;
  background?: string;
  foreground?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.tag, { backgroundColor: background ?? colors.secondary }]}>
      <Text style={[styles.tagText, { color: foreground ?? colors.secondaryForeground }]}>
        {children}
      </Text>
    </View>
  );
}

export function Hairline() {
  const colors = useColors();
  return <View style={[styles.hairline, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 22,
    gap: 22,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  bodyText: { fontSize: 14, lineHeight: 21 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionCopy: { flex: 1, gap: 4 },
  sectionTitle: { fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700' },
  progressTrack: { width: '100%', height: 7, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  hairline: { height: StyleSheet.hairlineWidth, width: '100%' },
});
