/**
 * AnalyticsConsentScreen - First-run, opt-in pseudonymous-analytics consent.
 *
 * Shown after biometric setup and before the success screen — the final
 * onboarding step before the wallet home. Either choice persists via
 * `resolveConsentPrompt` and advances to success. Declining is the standard
 * close affordance: an X in the top-right (same idiom as sheet close buttons).
 *
 * Design: onboarding layout (themed icon + centered heading, like
 * biometric-setup.tsx / success.tsx). The body is one centered paragraph with
 * bolded key phrases, plus a Settings footnote; the accept button is pinned
 * to the bottom.
 */

import {
  colors,
  contentPadding,
  fontFamilyNative,
  fontSize,
  lineHeight,
  spacing,
  useAnalyticsConsent,
} from '@salmon/shared';
import { PrimaryButton } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ICON_SIZE = 80;

export default function AnalyticsConsentScreen() {
  const { t } = useTranslation();
  const { resolveConsentPrompt } = useAnalyticsConsent();
  const insets = useSafeAreaInsets();

  const resolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      router.replace('/(auth)/success');
    },
    [resolveConsentPrompt],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Absolute children ignore the SafeAreaView padding, so offset by the inset. */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + spacing.sm }]}
        onPress={() => resolve(false)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t('general.close', 'Close')}
        testID="analytics-consent-decline"
      >
        <Ionicons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerContent} testID="analytics-consent-screen">
          <View style={styles.iconContainer}>
            <Ionicons name="stats-chart-outline" size={ICON_SIZE} color={colors.text.primary} />
          </View>

          <Text style={styles.title}>{t('settings.analytics_prompt_title')}</Text>
          <Text style={styles.body}>
            <Trans
              i18nKey="settings.analytics_prompt_body"
              components={{ bold: <Text style={styles.bold} /> }}
            />
          </Text>
          <Text style={styles.foot}>
            <Trans
              i18nKey="settings.analytics_prompt_footnote"
              components={{ bold: <Text style={styles.bold} /> }}
            />
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <PrimaryButton onPress={() => resolve(true)} testID="analytics-consent-accept">
            {t('settings.analytics_prompt_accept')}
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: contentPadding.screen,
    zIndex: 1,
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: contentPadding.screen,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.relaxed,
    textAlign: 'center',
  },
  bold: {
    fontFamily: fontFamilyNative.bold,
  },
  foot: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
    opacity: 0.8,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  buttonsContainer: {
    marginTop: 'auto',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
});
