import React, { useState } from 'react';
import { LANGUAGES, deviceLanguage, useT } from '@/i18n';
import i18n from '@/i18n';
import { LanguageSheet } from '@/components/LanguageSheet';
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
      accessibilityLabel={i18n.t('settings.modeA11y', { title })}
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
    Alert.alert(i18n.t('settings.webOnly', { what }), i18n.t('settings.webOnlyBody'));
    return true;
  }
  return false;
};

export default function SettingsScreen() {
  const colors = useColors();
  const { t } = useT();
  const [langOpen, setLangOpen] = useState(false);
  const {
    language,
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

  return (
    <Page>
      <View style={styles.header}>
        <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
        <PageTitle>{t('settings.title')}</PageTitle>
        <BodyText style={styles.headerCopy}>{t('settings.intro')}</BodyText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('settings.language')}: ${currentLanguageName}`}
        onPress={() => setLangOpen(true)}
        testID="open-language"
        style={({ pressed }) => [styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="globe" size={17} color={colors.primary} />
        </View>
        <View style={styles.modeCopy}>
          <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.language')}</Text>
          <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{currentLanguageName}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />

      <View style={styles.section}>
        <SectionHeading title={t('settings.lookTitle')} subtitle={t('settings.lookSub')} />
        <ModeOption
          mode="playful"
          title={t('settings.colorful')}
          subtitle={t('settings.colorfulSub')}
          icon="sun"
          selected={visualMode === 'playful'}
          onPress={() => setVisualMode('playful')}
        />
        <ModeOption
          mode="focused"
          title={t('settings.calm')}
          subtitle={t('settings.calmSub')}
          icon="target"
          selected={visualMode === 'focused'}
          onPress={() => setVisualMode('focused')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title={t('settings.remindersTitle')} subtitle={t('settings.remindersSub')} />
        <ToggleRow
          icon="bell"
          title={t('settings.transitions')}
          subtitle={t('settings.transitionsSub')}
          value={remindersEnabled}
          onChange={(v) => void toggleReminders(v)}
          testID="toggle-reminders"
        />
        {remindersEnabled ? (
          <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('settings.remindBefore')}</Text>
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
                    <Text style={{ color: sel ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{t('common.minutes', { count: m })}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.quietRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.quietHours')}</Text>
                <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
                  {quietOn ? t('settings.quietOn', { start: formatMinutes(quietStart), end: formatMinutes(quietEnd) }) : t('settings.quietOff')}
                </Text>
              </View>
              <Switch
                value={quietOn}
                onValueChange={(on) =>
                  on ? setQuietHours(profile?.sleep ?? 22 * 60, profile?.wake ?? 7 * 60) : setQuietHours(null, null)
                }
                trackColor={{ true: colors.primary, false: colors.input }}
                accessibilityLabel={t('settings.quietHours')}
                testID="toggle-quiet"
              />
            </View>
            {quietOn ? (
              <View style={styles.chipRow}>
                {([[t('settings.start'), quietStart, (v: number) => setQuietHours(v, quietEnd)], [t('settings.end'), quietEnd, (v: number) => setQuietHours(quietStart, v)]] as const).map(([label, value, setV]) => (
                  <View key={label} style={[styles.quietStep, { backgroundColor: colors.muted }]}>
                    <Pressable accessibilityLabel={t('settings.earlier', { label })} hitSlop={6} onPress={() => setV(((value ?? 0) - 30 + 1440) % 1440)}>
                      <Feather name="minus" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.quietText, { color: colors.foreground }]}>{label} {formatMinutes(value ?? 0)}</Text>
                    <Pressable accessibilityLabel={t('settings.later', { label })} hitSlop={6} onPress={() => setV(((value ?? 0) + 30) % 1440)}>
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
          title={t('settings.calendar')}
          subtitle={t('settings.calendarSub')}
          value={calendarSyncEnabled}
          onChange={(v) => void toggleCalendar(v)}
          testID="toggle-calendar"
        />
        {Platform.OS === 'ios' ? (
          <ToggleRow
            icon="smartphone"
            title={t('settings.liveActivity')}
            subtitle={t('settings.liveActivitySub')}
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
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.widget')}</Text>
            <Text style={[styles.modeSubtitle, { color: colors.secondaryForeground }]}>
              {Platform.OS === 'android' ? t('settings.widgetAndroid') : t('settings.widgetIos')}
            </Text>
          </View>
        </View>
        <View style={[styles.toggleRow, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
          <View style={[styles.modeIcon, { backgroundColor: colors.card }]}>
            <Feather name="zap" size={17} color={colors.primary} />
          </View>
          <View style={styles.modeCopy}>
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.quickAdd')}</Text>
            <Text style={[styles.modeSubtitle, { color: colors.secondaryForeground }]}>
              {Platform.OS === 'ios' ? t('settings.quickAddIos') : t('settings.quickAddAndroid')}
            </Text>
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
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.startOver')}</Text>
            <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{t('settings.startOverSub')}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeading title={t('settings.timeTitle')} subtitle={t('settings.timeSub')} />
        <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('settings.breakBetween')}</Text>
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
                  <Text style={{ color: sel ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{m === 0 ? t('settings.none') : t('common.minutes', { count: m })}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
            {t('settings.breakHint')}
          </Text>
        </View>

        <View style={[styles.subPanel, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{t('settings.patterns')}</Text>
          {tendency ? (
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>
              {tendency.ratio > 1.1
                ? t('settings.patternLonger', { pct: Math.round((tendency.ratio - 1) * 100) })
                : tendency.ratio < 0.9
                  ? t('settings.patternFaster', { pct: Math.round((1 - tendency.ratio) * 100) })
                  : t('settings.patternSpotOn')}
            </Text>
          ) : (
            <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
              {t('settings.patternEmpty')}
            </Text>
          )}
          {overrunners.map(({ title, ins }) => (
            <View key={title} style={styles.patternRow}>
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Text style={[styles.patternText, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.patternMeta, { color: colors.mutedForeground }]}>
                {t('settings.patternRow', { planned: ins.typicalPlanned, actual: ins.typicalActual })}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('settings.feedbackHint')}
        onPress={() => router.push('/feedback')}
        testID="open-feedback"
        style={({ pressed }) => [styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="message-circle" size={17} color={colors.primary} />
        </View>
        <View style={styles.modeCopy}>
          <Text style={[styles.modeTitle, { color: colors.foreground }]}>{t('settings.feedback')}</Text>
          <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>{t('settings.feedbackSub')}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Card style={styles.promiseCard}>
        <View style={[styles.promiseIcon, { backgroundColor: colors.sage }]}>
          <Feather name="shield" size={18} color={colors.primary} />
        </View>
        <View style={styles.promiseCopy}>
          <Text style={[styles.promiseTitle, { color: colors.foreground }]}>{t('settings.privacyTitle')}</Text>
          <BodyText>{t('settings.privacyBody')}</BodyText>
        </View>
      </Card>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerBrand, { color: colors.foreground }]}>dayflow</Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          {t('settings.tagline')}
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
