/**
 * Seed entry, on the onboarding slot grid.
 *
 * The phrase is typed one word per box (`SeedPhraseEntry`), not into a single
 * free-text field. The textarea this replaces hid every mistake that matters —
 * a missing word, a transposed pair, a word the browser "corrected" — and the
 * DOM was the last surface still showing one after mobile moved.
 *
 * The other thing that had to survive is why this screen was already the least
 * broken in the flow: it reserved the "Next" button's space with
 * `visibility: hidden` instead of mounting it when the phrase became valid.
 * That is now `ReservedSlot`, used by every screen with a conditional control.
 *
 * Water, not bedrock (owner, 2026-08-18): the Bedrock Rule narrowed to seed
 * EXHIBITION (create's warning/display/validate). Entry of an existing phrase
 * is not that ceremony, so this screen stands in the flow's own water. The
 * capture protection is unchanged.
 */
import Typography from '@mui/material/Typography';
import {
  componentSizes,
  distributePhrase,
  fontFamily,
  fontSize,
  lineHeight,
  normalizeMnemonic,
  semantic,
  SHORT_PHRASE,
  validateMnemonic,
} from '@salmon/shared';
import { KeyIcon } from '../../icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { SeedPhraseEntry } from '../SeedPhrase';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  ReservedSlot,
} from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { WaterColumn } from '../WaterColumn';
import type { RecoverWalletPageProps } from './types';

const InvalidNotice = styled(Typography)({
  color: semantic.status.danger,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
  lineHeight: `${Math.round(fontSize.body * lineHeight.snug)}px`,
  textAlign: 'center',
});

export function RecoverWalletPage({
  onComplete,
  onBack,
}: RecoverWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  // One entry per box. Twelve to begin with; a paste or a thirteenth typed
  // word grows it to twenty-four.
  const [words, setWords] = useState<string[]>(() => Array<string>(SHORT_PHRASE).fill(''));
  // What was actually pasted, so the screen can say what happened rather than
  // only that something is wrong. `null` means nothing was rejected.
  const [pastedCount, setPastedCount] = useState<number | null>(null);

  const phrase = useMemo(() => normalizeMnemonic(words.join(' ')), [words]);
  const isComplete = words.every((word) => word.length > 0);
  const isValidSeedPhrase = isComplete && validateMnemonic(phrase);

  const handleWords = useCallback((next: string[]) => {
    setWords(next);
    setPastedCount(null);
  }, []);

  const handleLength = useCallback((length: number) => {
    setWords((prev) =>
      prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? '')
    );
  }, []);

  /**
   * Paste from the clipboard. Goes through the same `distributePhrase` the
   * grid's own paste uses, so the button and an in-box paste cannot behave
   * differently.
   */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const { words: pasted, fits, count } = distributePhrase(text);
      setPastedCount(fits ? null : count);
      setWords(pasted);
    } catch {
      // Clipboard API may not be available, or permission was refused.
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!isValidSeedPhrase) return;
    onComplete(phrase);
  }, [isValidSeedPhrase, onComplete, phrase]);

  // Only once every box is filled — telling someone their phrase is invalid
  // while they are still typing it is noise.
  const showInvalid = pastedCount !== null || (isComplete && !isValidSeedPhrase);

  return (
    <OnboardingLayout
      testID="recover-screen"
      variant="content"
      /*
        No bedrock (owner, 2026-08-18): the Bedrock Rule narrowed to the
        EXHIBITION of a seed — create's warning/display/validate. Entering an
        existing phrase is not the ceremonial moment of its birth, so recover
        stands in the same water as the rest of the flow. Capture protection
        is unchanged.
      */
      background={<WaterColumn />}
      /*
        The key: what this screen asks for is the thing that reopens the
        wallet. Mirrors the mobile flow (owner, 2026-08-18): the fish stays on
        welcome and the lock only; each flow step wears one semantic glyph in
        the mark slot, the consent screen's pattern and size.
      */
      mark={<KeyIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
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
          <InvalidNotice data-testid="recover-invalid-phrase">
            {pastedCount !== null
              ? t('wallet.recover.pastedWordCount', { count: pastedCount })
              : t('wallet.create.invalidSeed')}
          </InvalidNotice>
        ) : undefined
      }
      secondary={
        <SecondaryButton onClick={handlePaste} fullWidth testID="recover-paste-button">
          {t('wallet.recover.pasteSeed')}
        </SecondaryButton>
      }
      action={
        <ReservedSlot visible={isValidSeedPhrase}>
          <PrimaryButton onClick={handleNext} fullWidth testID="recover-next-button">
            {t('actions.next')}
          </PrimaryButton>
        </ReservedSlot>
      }
    />
  );
}
