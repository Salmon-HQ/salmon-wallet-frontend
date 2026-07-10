import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@salmon/shared';

/**
 * First-run, opt-in consent prompt for anonymous usage analytics on mobile.
 * Shown once after onboarding. Presentational — the caller wires it to
 * `useAnalyticsConsent` (visible when `needsConsentPrompt`, resolve on press).
 */
export interface AnalyticsConsentPromptProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AnalyticsConsentPrompt({
  visible,
  onAccept,
  onDecline,
}: AnalyticsConsentPromptProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="analytics-consent-prompt">
          <Text style={styles.title}>{t('settings.analytics_prompt_title')}</Text>
          <Text style={styles.body}>{t('settings.analytics_prompt_body')}</Text>
          <Text style={styles.bullet}>{'✓ '}{t('settings.analytics_prompt_include')}</Text>
          <Text style={styles.bullet}>{'✕ '}{t('settings.analytics_prompt_exclude')}</Text>
          <Text style={styles.foot}>{t('settings.analytics_prompt_footnote')}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={onDecline}
              testID="analytics-consent-decline"
              accessibilityRole="button"
            >
              <Text style={styles.declineText}>{t('settings.analytics_prompt_decline')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              testID="analytics-consent-accept"
              accessibilityRole="button"
            >
              <Text style={styles.acceptText}>{t('settings.analytics_prompt_accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.background.secondary, borderRadius: 16, padding: 22, gap: 10 },
  title: { color: colors.text.primary, fontSize: 20, fontWeight: '700' },
  body: { color: colors.text.secondary, fontSize: 15, lineHeight: 21 },
  bullet: { color: colors.text.secondary, fontSize: 14 },
  foot: { color: colors.text.secondary, fontSize: 13, opacity: 0.8, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  declineText: { color: colors.text.secondary, fontSize: 15, fontWeight: '600' },
  acceptBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 12, backgroundColor: colors.accent.primary },
  acceptText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
