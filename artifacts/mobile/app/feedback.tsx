import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayflow } from '@/context/DayflowContext';
import { useColors } from '@/hooks/useColors';
import { CloudBuddy } from '@/components/CloudBuddy';

export const FEEDBACK_EMAIL = 'cs.nexatech@gmail.com';

type Kind = 'bug' | 'idea' | 'other';
const KINDS: Array<{ key: Kind; label: string; icon: keyof typeof Feather.glyphMap; placeholder: string }> = [
  { key: 'bug', label: 'Something’s broken', icon: 'alert-circle', placeholder: 'What happened? What did you expect instead?\nSteps to make it happen again help a lot.' },
  { key: 'idea', label: 'An idea', icon: 'zap', placeholder: 'What would make Dayflow work better for you?' },
  { key: 'other', label: 'Something else', icon: 'message-circle', placeholder: 'Tell us anything — we read every message.' },
];

/** Technical details only — never task titles or other personal content. */
function deviceInfo(counts: { tasks: number; routines: number; inbox: number }, mode: string) {
  const version = Constants.expoConfig?.version ?? 'unknown';
  return [
    '— Device info (helps us find bugs) —',
    `App: Dayflow ${version}`,
    `OS: ${Platform.OS} ${Device.osVersion ?? Platform.Version}`,
    `Device: ${Device.manufacturer ?? ''} ${Device.modelName ?? 'unknown'}`.trim(),
    `Look: ${mode}`,
    `Data: ${counts.tasks} activities, ${counts.routines} routines, ${counts.inbox} inbox items`,
    `Sent: ${new Date().toISOString()}`,
  ].join('\n');
}

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dayTasks, routines, inboxTasks, visualMode } = useDayflow();
  const [kind, setKind] = useState<Kind>('bug');
  const [message, setMessage] = useState('');
  const [includeInfo, setIncludeInfo] = useState(true);
  const [sent, setSent] = useState(false);
  const current = KINDS.find((k) => k.key === kind)!;
  const canSend = message.trim().length > 0;

  const send = async () => {
    if (!canSend) return;
    const subject = `[Dayflow ${kind === 'bug' ? 'Bug' : kind === 'idea' ? 'Idea' : 'Feedback'}] ${message.trim().split('\n')[0].slice(0, 60)}`;
    const body =
      message.trim() +
      (includeInfo
        ? `\n\n\n${deviceInfo({ tasks: dayTasks.length, routines: routines.length, inbox: inboxTasks.length }, visualMode)}`
        : '');

    try {
      if (await MailComposer.isAvailableAsync()) {
        const result = await MailComposer.composeAsync({ recipients: [FEEDBACK_EMAIL], subject, body });
        if (result.status === MailComposer.MailComposerStatus.SENT || result.status === MailComposer.MailComposerStatus.SAVED) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSent(true);
        }
        return;
      }
      // No mail account set up in the Mail app → hand off to any mail client.
      const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        setSent(true);
        return;
      }
      throw new Error('no mail app');
    } catch {
      Alert.alert(
        'Couldn’t open email',
        `Please write to us at ${FEEDBACK_EMAIL}. Thank you!`,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }]}
    >
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} testID="feedback-close">
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topLabel, { color: colors.foreground }]}>FEEDBACK</Text>
        <View style={{ width: 24 }} />
      </View>

      {sent ? (
        <View style={styles.center}>
          <CloudBuddy mood="happy" size={170} />
          <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>Thank you!</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground, textAlign: 'center' }]}>
            We read every message and use it to make Dayflow kinder and better.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.send, { backgroundColor: colors.primary, alignSelf: 'stretch' }]} testID="feedback-done">
            <Text style={[styles.sendText, { color: colors.primaryForeground }]}>Back to Dayflow</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <CloudBuddy mood="hello" size={110} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Tell us what’s up</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Found a bug or have an idea? A real person on our team reads this.
              </Text>
            </View>
          </View>

          <View style={styles.kinds}>
            {KINDS.map((k) => {
              const sel = k.key === kind;
              return (
                <Pressable
                  key={k.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  onPress={() => setKind(k.key)}
                  testID={`feedback-kind-${k.key}`}
                  style={[styles.kind, { backgroundColor: sel ? colors.secondary : colors.card, borderColor: sel ? colors.primary : colors.border }]}
                >
                  <Feather name={k.icon} size={18} color={sel ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.kindText, { color: colors.foreground }]} numberOfLines={2}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={current.placeholder}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel="Your message"
            testID="feedback-message"
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />

          <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Include device info</Text>
              <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
                App version, phone model and OS. Never your tasks or notes.
              </Text>
            </View>
            <Switch
              value={includeInfo}
              onValueChange={setIncludeInfo}
              trackColor={{ true: colors.primary, false: colors.input }}
              accessibilityLabel="Include device info"
              testID="feedback-info"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => void send()}
            testID="feedback-send"
            style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: !canSend ? 0.4 : pressed ? 0.85 : 1 }]}
          >
            <Feather name="send" size={17} color={colors.primaryForeground} />
            <Text style={[styles.sendText, { color: colors.primaryForeground }]}>Send</Text>
          </Pressable>
          <Text style={[styles.foot, { color: colors.mutedForeground }]}>Opens your email app · {FEEDBACK_EMAIL}</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  top: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  body: { gap: 14, paddingTop: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1.5 },
  kindText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  input: { minHeight: 160, padding: 16, borderRadius: 20, borderWidth: 1, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoSub: { fontSize: 12, marginTop: 2 },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 27, marginTop: 4 },
  sendText: { fontSize: 16, fontWeight: '700' },
  foot: { fontSize: 12, textAlign: 'center' },
});
