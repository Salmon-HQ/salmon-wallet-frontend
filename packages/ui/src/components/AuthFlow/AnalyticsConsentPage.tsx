/**
 * First-run, opt-in pseudonymous-analytics consent — the final onboarding step
 * before the wallet home. Presentational only: the caller wires accept/decline
 * to `useAnalyticsConsent().resolveConsentPrompt` and then advances the flow.
 *
 * The mobile twin is `apps/mobile/app/(auth)/analytics-consent.tsx`. On the
 * grid, the metrics glyph is the screen's only icon and sits in the `mark`
 * slot, where the fish sat before the owner restructured this screen
 * (2026-08-18): glyph on top, title, then the body copy immediately after it
 * — the hole between title and copy is gone — with the "turn it off any
 * time" line in `assist` and Accept bottom-most. The close affordance is the
 * `chrome` band's leading control — drawn as an X, not a back chevron,
 * because declining advances the flow rather than backing out of it. Its
 * description is the longest in the flow at roughly seven lines, so it is
 * not a "mini description": it lives in `body`, which is the give, and the
 * always-empty description band collapses (`contentTight`) so the copy starts
 * one title line under the title instead of below a reserved void.
 */
import { componentSizes, fontFamily, fontSize, fontWeight, lineHeight } from '@salmon/shared';
import React, { type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ChartBarIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { WaterColumn } from '../WaterColumn';
import type { AnalyticsConsentPageProps } from './types';

/** The glyph fills the top slot: the grid's own mark size for `content`. */
const ICON_SIZE = componentSizes.logoSizeSmall;

const bold: CSSProperties = { fontWeight: fontWeight.bold };

export function AnalyticsConsentPage({
  onAccept,
  onDecline,
}: AnalyticsConsentPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  const copy: CSSProperties = {
    color: text.primary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyLg,
    lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
  };

  const foot: CSSProperties = {
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    lineHeight: `${Math.round(fontSize.body * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
  };

  return (
    <OnboardingLayout
      testID="analytics-consent-screen"
      variant="contentTight"
      background={<WaterColumn />}
      scrollBody
      chrome={
        <ScreenHeader
          onBack={onDecline}
          glyph="close"
          backLabel={t('settings.analytics_prompt_close')}
          testID="analytics-consent-decline"
        />
      }
      /*
        The metrics glyph takes the top slot the fish used to hold — one icon
        on the screen, not two, the same glyph mobile draws.
      */
      mark={<ChartBarIcon size={ICON_SIZE} color={text.primary} />}
      title={<OnboardingTitle>{t('settings.analytics_prompt_title')}</OnboardingTitle>}
      body={
        /*
          Centred in the body slot, not pinned to its top. This is the one
          screen of its variant and `body` holds every point the collapsed
          description and secondary bands gave back, so pinning the copy up
          left the icon, title and copy clustered high over a hole. The band
          already owns the space — the copy is centred in it, not padded down.
        */
        <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
          <p style={copy}>
            <Trans
              i18nKey="settings.analytics_prompt_body"
              components={{ bold: <strong style={bold} /> }}
            />
          </p>
        </div>
      }
      assist={
        <p style={foot}>
          <Trans
            i18nKey="settings.analytics_prompt_footnote"
            components={{ bold: <strong style={bold} /> }}
          />
        </p>
      }
      action={
        <PrimaryButton onPress={onAccept} fullWidth testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
      }
    />
  );
}
