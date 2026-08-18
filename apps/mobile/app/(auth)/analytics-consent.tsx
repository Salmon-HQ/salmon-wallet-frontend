/**
 * AnalyticsConsentScreen - First-run, opt-in pseudonymous-analytics consent.
 *
 * Shown after the success screen — the final onboarding step before the
 * wallet home. Both of success's exits funnel through here (directly via
 * "Go to my Account", or after the derived-accounts detour), so consent is
 * asked exactly once and cannot be skipped. Either choice persists via
 * `resolveConsentPrompt` and enters the app.
 *
 * Composed on the onboarding slot grid, which is the biggest visible change of
 * any screen in the flow: it had no mark and no header, a 72px chart glyph
 * standing in for the mark, a 36px hardcoded title, and an absolutely
 * positioned close button that reserved nothing. It gains the mark and the
 * chrome band; the glyph and the long body copy move into `body`, and
 * declining is the chrome band's affordance — drawn as an X, not a back
 * chevron, because declining advances the flow rather than backing out.
 */

import {
  colors,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  semantic,
  spacing,
  useAnalyticsConsent,
} from '@salmon/shared';
import {
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ScreenHeader,
} from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const ICON_SIZE = 80;

export default function AnalyticsConsentScreen() {
  const { t } = useTranslation();
  const { resolveConsentPrompt } = useAnalyticsConsent();

  const resolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      router.replace('/(app)/(tabs)');
    },
    [resolveConsentPrompt]
  );

  return (
    <OnboardingLayout
      testID="analytics-consent-screen"
      variant="content"
      chrome={
        <ScreenHeader
          onBack={() => resolve(false)}
          glyph="close"
          backLabel={t('settings.analytics_prompt_close')}
          testID="analytics-consent-decline"
        />
      }
      title={<OnboardingTitle>{t('settings.analytics_prompt_title')}</OnboardingTitle>}
      body={
        <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <Ionicons name="stats-chart-outline" size={ICON_SIZE} color={colors.text.primary} />
          </View>
          {/*
            The longest description in the flow at roughly seven lines. It is
            not a "mini description" and must not be forced into that slot, so
            it lives in `body` — which is the give — and the description band
            stays reserved and empty like any other unused slot.
          */}
          <Text style={styles.copy} maxFontSizeMultiplier={fontScaleCap.chrome}>
            <Trans
              i18nKey="settings.analytics_prompt_body"
              components={{ bold: <Text style={styles.bold} /> }}
            />
          </Text>
          <Text style={styles.foot} maxFontSizeMultiplier={fontScaleCap.chrome}>
            <Trans
              i18nKey="settings.analytics_prompt_footnote"
              components={{ bold: <Text style={styles.bold} /> }}
            />
          </Text>
        </ScrollView>
      }
      action={
        <PrimaryButton onPress={() => resolve(true)} testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
      }
    />
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  copy: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  bold: {
    fontFamily: fontFamilyNative.bold,
  },
  foot: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.normal,
    textAlign: 'center',
  },
});
