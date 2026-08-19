/**
 * AnalyticsConsentScreen - First-run, opt-in pseudonymous-analytics consent.
 *
 * Shown after the success screen — the final onboarding step before the
 * wallet home. Both of success's exits funnel through here (directly via
 * "Go to my Account", or after the derived-accounts detour), so consent is
 * asked exactly once and cannot be skipped. Either choice persists via
 * `resolveConsentPrompt` and enters the app.
 *
 * Composed on the onboarding slot grid. The metrics glyph is the screen's
 * only icon and sits in the `mark` slot, where the fish sat before the owner
 * restructured this screen (2026-08-18): glyph on top, title, then the body
 * copy immediately after it — the hole between title and copy is gone — with
 * the "turn it off any time" line in `assist` and Accept bottom-most.
 * Declining is the chrome band's affordance — drawn as an X, not a back
 * chevron, because declining advances the flow rather than backing out.
 */

import {
  colors,
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  semantic,
  useAnalyticsConsent,
} from '@salmon/shared';
import {
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ScreenHeader,
} from '../../src/components';
import { ChartBarIcon } from '../../src/icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

/** The glyph fills the top slot: the grid's own mark size for `content`. */
const ICON_SIZE = componentSizes.logoSizeSmall;

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
      float
      chrome={
        <ScreenHeader
          onBack={() => resolve(false)}
          glyph="close"
          backLabel={t('settings.analytics_prompt_close')}
          testID="analytics-consent-decline"
        />
      }
      /*
        The metrics glyph takes the top slot the fish used to hold — one icon
        on the screen, not two, and the same asset the body carried before.
      */
      mark={<ChartBarIcon size={ICON_SIZE} color={colors.text.primary} />}
      title={<OnboardingTitle>{t('settings.analytics_prompt_title')}</OnboardingTitle>}
      body={
        <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {/*
            The longest description in the flow at roughly seven lines. It is
            not a "mini description" and must not be forced into that slot, so
            it lives in `body` — which is the give — top-anchored so it reads
            immediately after the title instead of floating mid-slot.
          */}
          <Text style={styles.copy} maxFontSizeMultiplier={fontScaleCap.chrome}>
            <Trans
              i18nKey="settings.analytics_prompt_body"
              components={{ bold: <Text style={styles.bold} /> }}
            />
          </Text>
        </ScrollView>
      }
      assist={
        <Text style={styles.foot} maxFontSizeMultiplier={fontScaleCap.chrome}>
          <Trans
            i18nKey="settings.analytics_prompt_footnote"
            components={{ bold: <Text style={styles.bold} /> }}
          />
        </Text>
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
    justifyContent: 'flex-start',
  },
  copy: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    textAlign: 'center',
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
