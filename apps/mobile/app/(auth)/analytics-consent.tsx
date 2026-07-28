/**
 * AnalyticsConsentScreen - First-run, opt-in anonymous-analytics consent.
 *
 * Shown after biometric setup and before the success screen — the final
 * onboarding step before the wallet home. Either choice persists via
 * `resolveConsentPrompt` and advances to success.
 *
 * Design: onboarding layout (themed icon + centered heading, like
 * biometric-setup.tsx / success.tsx). The include/exclude points read as a
 * left-aligned bullet list with a hanging indent; buttons pinned to the bottom.
 */

import {
  colors,
  contentPadding,
  fontFamilyNative,
  spacing,
  useAnalyticsConsent,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ICON_SIZE = 80;

export default function AnalyticsConsentScreen() {
  const { t } = useTranslation();
  const { resolveConsentPrompt } = useAnalyticsConsent();

  const resolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      router.replace('/(auth)/success');
    },
    [resolveConsentPrompt],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          <Text style={styles.body}>{t('settings.analytics_prompt_body')}</Text>

          <View style={styles.details}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletMark}>✓</Text>
              <Text style={styles.bulletText}>{t('settings.analytics_prompt_include')}</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletMark}>✕</Text>
              <Text style={styles.bulletText}>{t('settings.analytics_prompt_exclude')}</Text>
            </View>
            <Text style={styles.foot}>{t('settings.analytics_prompt_footnote')}</Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <PrimaryButton
            onPress={() => resolve(true)}
            style={styles.buttonSpacing}
            testID="analytics-consent-accept"
          >
            {t('settings.analytics_prompt_accept')}
          </PrimaryButton>

          <SecondaryButton
            onPress={() => resolve(false)}
            testID="analytics-consent-decline"
          >
            {t('settings.analytics_prompt_decline')}
          </SecondaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    fontSize: 32,
    lineHeight: 40,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  details: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bulletMark: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 15,
    lineHeight: 22,
    width: 20,
  },
  bulletText: {
    flex: 1,
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  foot: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
    marginTop: spacing.md,
  },
  buttonsContainer: {
    marginTop: 'auto',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  buttonSpacing: {
    marginBottom: spacing.lg,
  },
});
