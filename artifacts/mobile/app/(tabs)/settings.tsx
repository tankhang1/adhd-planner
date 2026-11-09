import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BodyText, Card, Eyebrow, Page, PageTitle, SectionHeading } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import type { VisualMode } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';

function ModeOption({
  mode,
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  mode: VisualMode;
  title: string;
  subtitle: string;
  icon: 'sun' | 'target';
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} appearance`}
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={`appearance-${mode}`}
      style={({ pressed }) => [
        styles.modeOption,
        {
          backgroundColor: selected ? colors.secondary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.modeIcon, { backgroundColor: selected ? colors.primary : colors.muted }]}>
        <Feather name={icon} size={17} color={selected ? colors.primaryForeground : colors.mutedForeground} />
      </View>
      <View style={styles.modeCopy}>
        <Text style={[styles.modeTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Feather
        name={selected ? 'check-circle' : 'circle'}
        size={19}
        color={selected ? colors.primary : colors.mutedForeground}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { visualMode, setVisualMode } = useDayflow();
  const [showPlans, setShowPlans] = useState(false);

  return (
    <Page>
      <View style={styles.header}>
        <Eyebrow>MAKE IT FEEL LIKE YOURS</Eyebrow>
        <PageTitle>Your space.</PageTitle>
        <BodyText style={styles.headerCopy}>
          Keep the parts that help. The rest can stay out of the way.
        </BodyText>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Choose your feel" subtitle="Change this anytime." />
        <ModeOption
          mode="playful"
          title="Bright & gentle"
          subtitle="Warm color, a little more personality"
          icon="sun"
          selected={visualMode === 'playful'}
          onPress={() => setVisualMode('playful')}
        />
        <ModeOption
          mode="focused"
          title="Quiet & focused"
          subtitle="Softer contrast, fewer visual cues"
          icon="target"
          selected={visualMode === 'focused'}
          onPress={() => setVisualMode('focused')}
        />
      </View>

      <Card style={styles.promiseCard}>
        <View style={[styles.promiseIcon, { backgroundColor: colors.sage }]}>
          <Feather name="shield" size={18} color={colors.primary} />
        </View>
        <View style={styles.promiseCopy}>
          <Text style={[styles.promiseTitle, { color: colors.foreground }]}>Your plan stays yours</Text>
          <BodyText>Tasks and routines are saved on this device. No account needed for this prototype.</BodyText>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeading
          title="Clear, upfront pricing"
          subtitle="A preview of the plan in your product brief."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showPlans ? 'Hide pricing preview' : 'Show pricing preview'}
          accessibilityState={{ expanded: showPlans }}
          onPress={() => setShowPlans((value) => !value)}
          testID="toggle-pricing"
          style={({ pressed }) => [
            styles.pricingToggle,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Feather name="tag" size={17} color={colors.secondaryForeground} />
          <Text style={[styles.pricingToggleText, { color: colors.secondaryForeground }]}>
            {showPlans ? 'Hide plan details' : 'View plan details'}
          </Text>
          <Feather name={showPlans ? 'chevron-up' : 'chevron-down'} size={17} color={colors.secondaryForeground} />
        </Pressable>
        {showPlans ? (
          <View style={styles.planList}>
            <Card style={styles.planCard}>
              <View style={styles.planRow}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Free</Text>
                <Text style={[styles.planPrice, { color: colors.foreground }]}>$0</Text>
              </View>
              <BodyText>Visual day plan, focus timer, and two routines.</BodyText>
            </Card>
            <Card style={[styles.planCard, { borderColor: colors.primary }]}>
              <View style={styles.planRow}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Pro preview</Text>
                <Text style={[styles.planPrice, { color: colors.foreground }]}>$39.99 / year</Text>
              </View>
              <BodyText>Planned price only. No purchase is available in this UI prototype.</BodyText>
            </Card>
            <Text style={[styles.lifetimeNote, { color: colors.mutedForeground }]}>
              Lifetime option planned at $79.99. Prices shown in USD.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerBrand, { color: colors.foreground }]}>dayflow</Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          A visual planner with room to be human.
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  headerCopy: { maxWidth: 340, fontSize: 15, lineHeight: 22 },
  section: { gap: 11 },
  modeOption: { minHeight: 76, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  modeCopy: { flex: 1, gap: 3 },
  modeTitle: { fontSize: 14, fontWeight: '700' },
  modeSubtitle: { fontSize: 12, lineHeight: 16 },
  promiseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  promiseIcon: { width: 39, height: 39, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  promiseCopy: { flex: 1, gap: 5 },
  promiseTitle: { fontSize: 15, fontWeight: '700' },
  pricingToggle: { minHeight: 48, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  pricingToggleText: { flex: 1, fontSize: 14, fontWeight: '700' },
  planList: { gap: 10 },
  planCard: { gap: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planName: { fontSize: 15, fontWeight: '700' },
  planPrice: { fontSize: 14, fontWeight: '700' },
  lifetimeNote: { fontSize: 12, lineHeight: 18, paddingHorizontal: 3 },
  footer: { borderTopWidth: 1, paddingTop: 17, gap: 4 },
  footerBrand: { fontSize: 15, fontWeight: '700' },
  footerText: { fontSize: 12 },
});
