import React, { useState } from 'react';
import { LANGUAGES, deviceLanguage, useT } from '@/i18n';
import i18n from '@/i18n';
import { LanguageSheet } from '@/components/LanguageSheet';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { requestReminderPermission } from '@/services/reminders';
import { requestCalendarPermission } from '@/services/calendar';
import { Feather } from '@expo/vector-icons';
import { Page, PageTitle } from '@/components/DayflowUI';
import { CloudBuddy } from '@/components/CloudBuddy';
import { useDayflow } from '@/context/DayflowContext';
import { BUFFER_OPTIONS, REMINDER_LEADS, formatMinutes, overallTendency } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { usePro } from '@/context/ProContext';
import { ThemePicker } from '@/components/ThemePicker';

type IconName = keyof typeof Feather.glyphMap;

/* ------------------------------ Building blocks ------------------------------ */

/** A titled, rounded group of rows (iOS-style), so related settings read as one unit. */
function Group({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  const colors = useColors();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {rows.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? <Text style={[styles.groupFooter, { color: colors.mutedForeground }]}>{footer}</Text> : null}
    </View>
  );
}

function RowIcon({ name, tint }: { name: IconName; tint?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
      <Feather name={name} size={15} color={tint ?? colors.primary} />
    </View>
  );
}

/** Tappable row: icon, title, optional value on the right, chevron. */
function NavRow({ icon, title, value, onPress, testID, badge }: { icon: IconName; title: string; value?: string; onPress: () => void; testID: string; badge?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <RowIcon name={icon} />
      <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
      {badge ? <Text style={[styles.badge, { color: colors.primary, borderColor: colors.primary }]}>{badge}</Text> : null}
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]} numberOfLines={1}>{value}</Text> : null}
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

/** Switch row with an optional one-line hint. */
function SwitchRow({ icon, title, hint, value, onChange, testID, badge }: { icon: IconName; title: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID: string; badge?: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <RowIcon name={icon} />
      <View style={styles.rowCopy}>
        <View style={styles.titleLine}>
          <Text style={[styles.rowTitle, { color: colors.foreground, flex: 0, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
          {badge ? <Text style={[styles.badge, { color: colors.primary, borderColor: colors.primary }]}>{badge}</Text> : null}
        </View>
        {hint ? <Text style={[styles.rowHint, { color: colors.mutedForeground }]} numberOfLines={2}>{hint}</Text> : null}
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

/** Small segmented control for 2–4 choices. */
function Segmented<T extends string | number>({ options, value, onChange, label, testIDPrefix }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  testIDPrefix: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segment, { backgroundColor: colors.muted }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: sel }}
            onPress={() => onChange(o.value)}
            testID={`${testIDPrefix}-${o.value}`}
            style={[styles.segmentItem, sel && { backgroundColor: colors.card, ...styles.segmentRaised }]}
          >
            <Text style={[styles.segmentText, { color: sel ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A labelled control that sits under its own heading inside a group. */
function Field({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <RowIcon name={icon} />
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const notOnWeb = (what: string) => {
  if (Platform.OS === 'web') {
    Alert.alert(i18n.t('settings.webOnly', { what }), i18n.t('settings.webOnlyBody'));
    return true;
  }
  return false;
};

/* ---------------------------------- Screen ---------------------------------- */

export default function SettingsScreen() {
  const colors = useColors();
  const { t } = useT();
  const { isPro, showPaywall, showCustomerCenter, restore, offerPro } = usePro();
  const [langOpen, setLangOpen] = useState(false);
  const {
    language,
    visualMode, setVisualMode, remindersEnabled, setRemindersEnabled,
    calendarSyncEnabled, setCalendarSyncEnabled, resetOnboarding,
    liveActivityEnabled, setLiveActivityEnabled, appearance, setAppearance, openNowOnLaunch, setOpenNowOnLaunch,
    reminderLead, setReminderLead, quietStart, quietEnd, setQuietHours, profile,
    bufferMinutes, setBufferMinutes, timeLog,
  } = useDayflow();
  const tendency = overallTendency(timeLog);
  const quietOn = quietStart !== null && quietEnd !== null;
  const native = Platform.OS !== 'web';
  const currentLanguageName =
    language === 'system'
      ? `${t('languageSheet.system')} · ${LANGUAGES.find((l) => l.code === deviceLanguage())?.native}`
      : LANGUAGES.find((l) => l.code === language)?.native ?? 'English';

  const toggleReminders = async (on: boolean) => {
    if (!on) return setRemindersEnabled(false);
    if (notOnWeb(t('settings.remindersWord'))) return;
    const ok = await requestReminderPermission();
    if (!ok) Alert.alert(t('settings.notifOff'), t('settings.notifOffBody'));
    setRemindersEnabled(ok);
  };

  const toggleCalendar = async (on: boolean) => {
    if (!on) return setCalendarSyncEnabled(false);
    if (notOnWeb(t('settings.calendarWord'))) return;
    const ok = await requestCalendarPermission();
    if (!ok) Alert.alert(t('settings.calendarOff'), t('settings.calendarOffBody'));
    setCalendarSyncEnabled(ok);
  };

  // Free users get a preview (real first card, the rest blurred) instead of a dialog.
  const openInsights = () => router.push('/insights');

  const showWidgetHelp = () =>
    Alert.alert(
      t('settings.widgetsHelp'),
      `${Platform.OS === 'android' ? t('settings.widgetAndroid') : t('settings.widgetIos')}\n\n${t('settings.quickAdd')}: ${
        Platform.OS === 'ios' ? t('settings.quickAddIos') : t('settings.quickAddAndroid')
      }`,
    );

  const patternLine = tendency
    ? tendency.ratio > 1.1
      ? t('settings.patternLonger', { pct: Math.round((tendency.ratio - 1) * 100) })
      : tendency.ratio < 0.9
        ? t('settings.patternFaster', { pct: Math.round((1 - tendency.ratio) * 100) })
        : t('settings.patternSpotOn')
    : t('settings.patternEmpty');

  return (
    <Page>
      <PageTitle>{t('settings.title')}</PageTitle>

      {/* Pro banner */}
      {native ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void (isPro ? showCustomerCenter() : showPaywall('settings'))}
          testID="open-pro"
          style={({ pressed }) => [styles.pro, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
        >
          <CloudBuddy mood="happy" size={54} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.proTitle}>{t('settings.proTitle')}</Text>
            <Text style={styles.proSub} numberOfLines={2}>{isPro ? t('settings.proManage') : t('settings.proSub')}</Text>
          </View>
          {!isPro ? (
            <View style={styles.proCta}>
              <Text style={[styles.proCtaText, { color: colors.primary }]}>{t('settings.proUpgrade')}</Text>
            </View>
          ) : (
            <Feather name="chevron-right" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      ) : null}

      <Group title={t('settings.groupLook')}>
        <Field icon="eye" title={t('settings.style')}>
          <Segmented
            label={t('settings.style')}
            value={visualMode}
            onChange={setVisualMode}
            testIDPrefix="appearance"
            options={[
              { value: 'playful', label: t('settings.colorful') },
              { value: 'focused', label: t('settings.calm') },
            ]}
          />
        </Field>
        <Field icon="moon" title={t('settings.appearance')}>
          <Segmented
            label={t('settings.appearance')}
            value={appearance}
            onChange={setAppearance}
            testIDPrefix="appearance-mode"
            options={(['system', 'light', 'dark'] as const).map((a) => ({ value: a, label: t(`settings.appearance_${a}`) }))}
          />
        </Field>
        <View style={styles.field}>
          <ThemePicker bare />
        </View>
      </Group>

      <Group title={t('settings.groupReminders')}>
        <SwitchRow
          icon="bell"
          title={t('settings.transitions')}
          hint={t('settings.transitionsSub')}
          value={remindersEnabled}
          onChange={(v) => void toggleReminders(v)}
          testID="toggle-reminders"
        />
        {remindersEnabled ? (
          <Field icon="clock" title={t('settings.remindBefore')}>
            <Segmented
              label={t('settings.remindBefore')}
              value={reminderLead}
              onChange={setReminderLead}
              testIDPrefix="lead"
              options={REMINDER_LEADS.map((m) => ({ value: m, label: t('common.minutes', { count: m }) }))}
            />
          </Field>
        ) : null}
        {remindersEnabled ? (
          <SwitchRow
            icon="moon"
            title={t('settings.quietHours')}
            hint={quietOn ? t('settings.quietOn', { start: formatMinutes(quietStart), end: formatMinutes(quietEnd) }) : t('settings.quietOff')}
            value={quietOn}
            onChange={(on) => (on ? setQuietHours(profile?.sleep ?? 22 * 60, profile?.wake ?? 7 * 60) : setQuietHours(null, null))}
            testID="toggle-quiet"
          />
        ) : null}
        {remindersEnabled && quietOn ? (
          <View style={[styles.field, styles.steppers]}>
            {([[t('settings.start'), quietStart, (v: number) => setQuietHours(v, quietEnd)], [t('settings.end'), quietEnd, (v: number) => setQuietHours(quietStart, v)]] as const).map(([label, value, setV]) => (
              <View key={label} style={[styles.stepper, { backgroundColor: colors.muted }]}>
                <Pressable accessibilityLabel={t('settings.earlier', { label })} hitSlop={8} onPress={() => setV(((value ?? 0) - 30 + 1440) % 1440)}>
                  <Feather name="minus" size={16} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.stepperText, { color: colors.foreground }]}>{label} {formatMinutes(value ?? 0)}</Text>
                <Pressable accessibilityLabel={t('settings.later', { label })} hitSlop={8} onPress={() => setV(((value ?? 0) + 30) % 1440)}>
                  <Feather name="plus" size={16} color={colors.foreground} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </Group>

      <Group title={t('settings.groupDay')}>
        <Field icon="wind" title={t('settings.breakBetween')}>
          <Segmented
            label={t('settings.breakBetween')}
            value={bufferMinutes}
            onChange={setBufferMinutes}
            testIDPrefix="buffer"
            options={BUFFER_OPTIONS.map((m) => ({ value: m, label: m === 0 ? t('settings.none') : t('common.minutes', { count: m }) }))}
          />
        </Field>
        <SwitchRow
          icon="calendar"
          title={t('settings.calendar')}
          hint={t('settings.calendarSub')}
          value={calendarSyncEnabled}
          onChange={(v) => void toggleCalendar(v)}
          testID="toggle-calendar"
        />
        <SwitchRow
          icon="maximize"
          title={t('settings.openNow')}
          hint={t('settings.openNowSub')}
          value={openNowOnLaunch}
          onChange={setOpenNowOnLaunch}
          testID="toggle-open-now"
        />
        {Platform.OS === 'ios' ? (
          <SwitchRow
            icon="smartphone"
            title={t('settings.liveActivity')}
            hint={t('settings.liveActivitySub')}
            badge={isPro ? undefined : 'PRO'}
            value={liveActivityEnabled && isPro}
            onChange={async (v) => {
              if (v && !(await offerPro(t('settings.liveActivity'), t('settings.proLiveActivity'), 'live_activity'))) return;
              setLiveActivityEnabled(v);
            }}
            testID="toggle-live-activity"
          />
        ) : null}
        <NavRow icon="grid" title={t('settings.widgetsHelp')} onPress={showWidgetHelp} testID="widget-help" />
      </Group>

      <Group title={t('settings.groupInsights')} footer={patternLine}>
        <NavRow
          icon={isPro ? 'bar-chart-2' : 'lock'}
          title={t('settings.insightsTitle')}
          badge={isPro ? undefined : 'PRO'}
          onPress={openInsights}
          testID="open-insights"
        />
      </Group>

      <Group title={t('settings.groupGeneral')}>
        <NavRow icon="globe" title={t('settings.language')} value={currentLanguageName} onPress={() => setLangOpen(true)} testID="open-language" />
        <NavRow icon="message-circle" title={t('settings.feedback')} onPress={() => router.push('/feedback')} testID="open-feedback" />
        {native && !isPro ? (
          <NavRow
            icon="rotate-ccw"
            title={t('settings.proRestore')}
            onPress={async () => {
              const ok = await restore();
              Alert.alert(ok ? t('settings.proRestored') : t('settings.proNothingToRestore'));
            }}
            testID="restore-purchases"
          />
        ) : null}
        <NavRow
          icon="refresh-cw"
          title={t('settings.startOver')}
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding');
          }}
          testID="redo-onboarding"
        />
      </Group>
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />

      <View style={styles.footer}>
        <View style={styles.footerLine}>
          <Feather name="shield" size={13} color={colors.sageInk} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{t('settings.privacyBody')}</Text>
        </View>
        <Text style={[styles.footerBrand, { color: colors.mutedForeground }]}>dayflow · {t('settings.tagline')}</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  pro: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 10, paddingRight: 14, borderRadius: 22 },
  proTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  proSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 17 },
  proCta: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  proCtaText: { fontSize: 13, fontWeight: '800' },

  group: { gap: 7 },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 6 },
  groupCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  groupFooter: { fontSize: 12, lineHeight: 17, marginHorizontal: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 54, paddingVertical: 10 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowHint: { fontSize: 12, lineHeight: 16 },
  rowValue: { fontSize: 14, maxWidth: '45%' },
  badge: { fontSize: 10, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },

  field: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
  segmentRaised: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 0 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 38, borderRadius: 19 },
  stepperText: { fontSize: 13, fontWeight: '700' },

  footer: { alignItems: 'center', gap: 6, paddingTop: 4 },
  footerLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12 },
  footerBrand: { fontSize: 12, fontWeight: '600' },
});
