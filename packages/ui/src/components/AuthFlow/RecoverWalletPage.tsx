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
  distributePhrase,
  fontFamily,
  fontSize,
  lineHeight,
  normalizeMnemonic,
  SHORT_PHRASE,
  spacing,
  validateMnemonic,
} from '@salmon/shared';
import { useCallback, useMemo, useState } from 'react';
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
      const clipboard = await navigator.clipboard.readText();
      if (!clipboard) return;
      const { words: pasted, fits, count } = distributePhrase(clipboard);
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
