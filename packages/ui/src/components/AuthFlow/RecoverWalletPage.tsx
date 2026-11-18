/**
 * Seed entry, on the onboarding slot grid.
 *
 * The mobile twin is `apps/mobile/app/(auth)/recover.tsx`. The phrase is
 * typed one word per box (`SeedPhraseEntry`), not into a single free-text
 * field: a textarea hid every mistake that matters — a missing word, a
 * transposed pair, a word the browser "corrected".
 *
 * The "Next" button's space is reserved (`ReservedSlot`) rather than mounted
 * when the phrase becomes valid, so the twelfth word does not move the mark,
 * title, description and input under the user's hands.
 *
 * Water, not bedrock (owner, 2026-08-18): the Bedrock Rule narrowed to seed
 * EXHIBITION (create's warning/display/validate). Entry of an existing phrase
 * is not that ceremony, so this screen stands in the flow's own water.
 */
import {
  componentSizes,
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  useRecoveryPhraseEntry,
} from '@salmon/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { KeyIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  ReservedSlot,
} from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { SeedPhraseEntry } from '../SeedPhrase';
import { WaterColumn } from '../WaterColumn';
import type { RecoverWalletPageProps } from './types';

export function RecoverWalletPage({
  onComplete,
  onBack,
}: RecoverWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { status, text } = useSemantic();
  const {
    words,
    phrase,
    pastedCount,
    setPastedCount,
    isValidSeedPhrase,
    showInvalid,
    handleWords,
    handleLength,
    paste,
  } = useRecoveryPhraseEntry();

  /**
   * Paste from the clipboard. Goes through the same `distributePhrase` the
   * grid's own paste uses, so the button and an in-box paste cannot behave
   * differently.
   */
  const handlePaste = useCallback(async () => {
    try {
      paste(await navigator.clipboard.readText());
    } catch {
      // Clipboard API may not be available, or permission was refused.
    }
  }, [paste]);

  const handleNext = useCallback(() => {
    if (!isValidSeedPhrase) return;
    onComplete(phrase);
  }, [isValidSeedPhrase, onComplete, phrase]);

  return (
    <OnboardingLayout
      testID="recover-screen"
      variant="content"
      background={<WaterColumn />}
      scrollBody
      /*
        The key: what this screen asks for is the thing that reopens the
        wallet. Mirrors mobile: the fish stays on welcome and the lock only;
        each flow step wears one semantic glyph in the mark slot.
      */
      mark={<KeyIcon size={componentSizes.logoSizeSmall} color={text.primary} />}
      chrome={<ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />}
      title={<OnboardingTitle>{t('wallet.recover.messageTitle')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.recover.messageBody')}</OnboardingDescription>}
      body={
        <SeedPhraseEntry
          words={words}
          onChange={handleWords}
          onLengthChange={handleLength}
          onPasteRejected={setPastedCount}
        />
      }
      assist={
        showInvalid ? (
          <p
            data-testid="recover-invalid-phrase"
            style={{
              color: status.danger,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.body,
              lineHeight: `${Math.round(fontSize.body * lineHeight.snug)}px`,
              paddingLeft: spacing.sm,
              paddingRight: spacing.sm,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {pastedCount !== null
              ? t('wallet.recover.pastedWordCount', { count: pastedCount })
              : t('wallet.create.invalidSeed')}
          </p>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={handlePaste} fullWidth testID="recover-paste-button">
          {t('wallet.recover.pasteSeed')}
        </SecondaryButton>
      }
      action={
        <ReservedSlot visible={isValidSeedPhrase}>
          <PrimaryButton onPress={handleNext} fullWidth testID="recover-next-button">
            {t('actions.next')}
          </PrimaryButton>
        </ReservedSlot>
      }
    />
  );
}
