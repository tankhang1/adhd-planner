import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { requestReminderPermission } from '@/services/reminders';
import { requestCalendarPermission } from '@/services/calendar';
import { Feather } from '@expo/vector-icons';
import { BodyText, Card, Eyebrow, Page, PageTitle, SectionHeading } from '@/components/DayflowUI';
import { useDayflow } from '@/context/DayflowContext';
import { BUFFER_OPTIONS, REMINDER_LEADS, formatMinutes, insightFor, overallTendency } from '@/context/DayflowContext';
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

function ToggleRow({
  icon, title, subtitle, value, onChange, testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.modeIcon, { backgroundColor: value ? colors.primary : colors.muted }]}>
        <Feather name={icon} size={17} color={value ? colors.primaryForeground : colors.mutedForeground} />
      </View>
      <View style={styles.modeCopy}>
        <Text style={[styles.modeTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.input }}
        accessibilityLabel={title}
        testID={testID}
      />
    </View>
  );
}

const notOnWeb = (what: string) => {
  if (Platform.OS === 'web') {
    Alert.alert(`${what} works on the phone app`, 'Open Dayflow on iOS or Android to turn this on.');
    return true;
  }
  return false;
};

export default function SettingsScreen() {
  const colors = useColors();
  const {
    visualMode, setVisualMode, remindersEnabled, setRemindersEnabled,
    calendarSyncEnabled, setCalendarSyncEnabled, resetOnboarding,
    liveActivityEnabled, setLiveActivityEnabled,
    reminderLead, setReminderLead, quietStart, quietEnd, setQuietHours, profile,
    bufferMinutes, setBufferMinutes, timeLog,
  } = useDayflow();
  const tendency = overallTendency(timeLog);
  const overrunners = Array.from(new Set(timeLog.map((r) => r.title)))
    .map((title) => ({ title, ins: insightFor(timeLog, title) }))
    .filter((x): x is { title: string; ins: NonNullable<typeof x.ins> } => !!x.ins && x.ins.ratio > 1.2)
    .sort((a, b) => b.ins.ratio - a.ins.ratio)
    .slice(0, 3);
  const quietOn = quietStart !== null && quietEnd !== null;

  const toggleReminders = async (on: boolean) => {
    if (!on) return setRemindersEnabled(false);
    if (notOnWeb('Reminders')) return;
    const ok = await requestReminderPermission();
    if (!ok) Alert.alert('Notifications are off', 'Allow notifications for Dayflow in your phone settings.');
    setRemindersEnabled(ok);
  };

  const toggleCalendar = async (on: boolean) => {
    if (!on) return setCalendarSyncEnabled(false);
    if (notOnWeb('Calendar sync')) return;
    const ok = await requestCalendarPermission();
    if (!ok) Alert.alert('Calendar access is off', 'Allow calendar access for Dayflow in your phone settings.');
    setCalendarSyncEnabled(ok);
  };
  const [showPlans, setShowPlans] = useState(false);

  return (
    <Page>
      <View style={styles.header}>
        <Eyebrow>SETTINGS</Eyebrow>
        <PageTitle>Make it yours</PageTitle>
        <BodyText style={styles.headerCopy}>
          Keep what helps. Turn off what doesn’t.
        </BodyText>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Look & feel" subtitle="You can switch anytime." />
        <ModeOption
          mode="playful"
          title="Colorful"
          subtitle="Bright colors and tall blocks that show time"
          icon="sun"
          selected={visualMode === 'playful'}
          onPress={() => setVisualMode('playful')}
        />
        <ModeOption
          mode="focused"
          title="Calm"
          subtitle="Fewer colors, tidy blocks, less to look at"
          icon="target"
          selected={visualMode === 'focused'}
          onPress={() => setVisualMode('focused')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="Reminders & widgets" subtitle="Gentle nudges, never nagging." />
        <ToggleRow
          icon="bell"
          title="Transition reminders"
          subtitle="A heads-up 5 minutes before, and when it’s time"
          value={remindersEnabled}
          onChange={(v) => void toggleReminders(v)}
          testID="toggle-reminders"
        />
        {remindersEnabled ? (
          <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Remind me before each activity</Text>
            <View style={styles.chipRow}>
              {REMINDER_LEADS.map((m) => {
                const sel = m === reminderLead;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    onPress={() => setReminderLead(m)}
                    testID={`lead-${m}`}
                    style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.muted }]}
                  >
                    <Text style={{ color: sel ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{m} min</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.quietRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, { color: colors.foreground }]}>Quiet hours</Text>
                <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
                  {quietOn ? `No reminders ${formatMinutes(quietStart)} – ${formatMinutes(quietEnd)}` : 'Reminders can arrive at any time'}
                </Text>
              </View>
              <Switch
                value={quietOn}
                onValueChange={(on) =>
                  on ? setQuietHours(profile?.sleep ?? 22 * 60, profile?.wake ?? 7 * 60) : setQuietHours(null, null)
                }
                trackColor={{ true: colors.primary, false: colors.input }}
                accessibilityLabel="Quiet hours"
                testID="toggle-quiet"
              />
            </View>
            {quietOn ? (
              <View style={styles.chipRow}>
                {([['Start', quietStart, (v: number) => setQuietHours(v, quietEnd)], ['End', quietEnd, (v: number) => setQuietHours(quietStart, v)]] as const).map(([label, value, setV]) => (
                  <View key={label} style={[styles.quietStep, { backgroundColor: colors.muted }]}>
                    <Pressable accessibilityLabel={`${label} earlier`} hitSlop={6} onPress={() => setV(((value ?? 0) - 30 + 1440) % 1440)}>
                      <Feather name="minus" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.quietText, { color: colors.foreground }]}>{label} {formatMinutes(value ?? 0)}</Text>
                    <Pressable accessibilityLabel={`${label} later`} hitSlop={6} onPress={() => setV(((value ?? 0) + 30) % 1440)}>
                      <Feather name="plus" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        <ToggleRow
          icon="calendar"
          title="Show my calendar"
          subtitle="Events from Apple, Google or Outlook calendars on this phone"
          value={calendarSyncEnabled}
          onChange={(v) => void toggleCalendar(v)}
          testID="toggle-calendar"
        />
        {Platform.OS === 'ios' ? (
          <ToggleRow
            icon="smartphone"
            title="Live Activity"
            subtitle="Countdown on the lock screen & Dynamic Island while a block is running"
            value={liveActivityEnabled}
            onChange={setLiveActivityEnabled}
            testID="toggle-live-activity"
          />
        ) : null}
        <View style={[styles.toggleRow, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
          <View style={[styles.modeIcon, { backgroundColor: colors.card }]}>
            <Feather name="grid" size={17} color={colors.primary} />
          </View>
          <View style={styles.modeCopy}>
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>Add a widget</Text>
            <Text style={[styles.modeSubtitle, { color: colors.secondaryForeground }]}>
              {Platform.OS === 'android'
                ? 'Long-press your home screen → Widgets → Dayflow.'
                : 'Long-press your home or lock screen → Edit → Add widget → Dayflow.'}
            </Text>
          </View>
        <View style={[styles.toggleRow, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
          <View style={[styles.modeIcon, { backgroundColor: colors.card }]}>
            <Feather name="zap" size={17} color={colors.primary} />
          </View>
          <View style={styles.modeCopy}>
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>Quick add from anywhere</Text>
            <Text style={[styles.modeSubtitle, { color: colors.secondaryForeground }]}>
              {Platform.OS === 'ios'
                ? 'Tap + on the widget, add “Dayflow quick add” to Control Center, or make a Shortcut that opens dayflow://capture and ask Siri.'
                : 'Make a home-screen shortcut to dayflow://capture.'}
            </Text>
          </View>
        </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding');
          }}
          testID="redo-onboarding"
          style={({ pressed }) => [styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
        >
          <View style={[styles.modeIcon, { backgroundColor: colors.muted }]}>
            <Feather name="refresh-cw" size={17} color={colors.mutedForeground} />
          </View>
          <View style={styles.modeCopy}>
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>Start today over</Text>
            <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>Answer 3 quick questions to rebuild today</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Time, made visible" subtitle="Learned quietly from your focus sessions." />
        <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Break between activities</Text>
          <View style={styles.chipRow}>
            {BUFFER_OPTIONS.map((m) => {
              const sel = m === bufferMinutes;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  onPress={() => setBufferMinutes(m)}
                  testID={`buffer-${m}`}
                  style={[styles.chip, { backgroundColor: sel ? colors.primary : colors.muted }]}
                >
                  <Text style={{ color: sel ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{m === 0 ? 'None' : `${m} min`}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
            Switching tasks takes time. New activities will start after this gap.
          </Text>
        </View>

        <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>How long things really take</Text>
          {tendency ? (
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>
              {tendency.ratio > 1.1
                ? `Things usually take you about ${Math.round((tendency.ratio - 1) * 100)}% longer than planned.`
                : tendency.ratio < 0.9
                  ? `You often finish about ${Math.round((1 - tendency.ratio) * 100)}% faster than planned.`
                  : 'Your time estimates have been spot on lately.'}
            </Text>
          ) : (
            <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
              Finish a few activities from the focus timer and Dayflow will show how long things really take — no judging, just info.
            </Text>
          )}
          {overrunners.map(({ title, ins }) => (
            <View key={title} style={styles.patternRow}>
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Text style={[styles.patternText, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.patternMeta, { color: colors.mutedForeground }]}>
                plan {ins.typicalPlanned}m → real {ins.typicalActual}m
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.promiseCard}>
        <View style={[styles.promiseIcon, { backgroundColor: colors.sage }]}>
          <Feather name="shield" size={18} color={colors.primary} />
        </View>
        <View style={styles.promiseCopy}>
          <Text style={[styles.promiseTitle, { color: colors.foreground }]}>Your data stays on your phone</Text>
          <BodyText>Everything is saved on this device. No account needed.</BodyText>
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
            {showPlans ? 'Hide prices' : 'See prices'}
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
              <BodyText>Visual timeline, focus timer, widgets and two routines.</BodyText>
            </Card>
            <Card style={[styles.planCard, { borderColor: colors.primary }]}>
              <View style={styles.planRow}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Pro</Text>
                <Text style={[styles.planPrice, { color: colors.foreground }]}>$39.99 / year</Text>
              </View>
              <BodyText>Unlimited routines, calendar sync and Live Activity. Coming soon.</BodyText>
            </Card>
            <Text style={[styles.lifetimeNote, { color: colors.mutedForeground }]}>
              Or pay once: $79.99 for life. Prices in USD.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerBrand, { color: colors.foreground }]}>dayflow</Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          A visual day planner for ADHD brains.
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  subPanel: { padding: 14, borderRadius: 20, borderWidth: 1, gap: 12, marginTop: -4 },
  subLabel: { fontSize: 12, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  quietRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quietStep: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 40, borderRadius: 20 },
  quietText: { fontSize: 13, fontWeight: '700' },
  patternRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patternText: { flex: 1, fontSize: 14, fontWeight: '600' },
  patternMeta: { fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 },
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
