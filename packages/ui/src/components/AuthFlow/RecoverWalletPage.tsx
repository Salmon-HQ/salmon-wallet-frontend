/**
 * Seed entry, on the onboarding slot grid.
 *
 * The one thing that had to survive the port is why this screen was already
 * the least broken in the flow: it reserved the "Next" button's space with
 * `visibility: hidden` instead of mounting it when the phrase became valid.
 * That is now `ReservedSlot`, used by every screen with a conditional control
 * — the mobile twin's version of this button used to move four slots by 36px
 * mid-typing because it did not do this.
 *
 * Bedrock, and no water: this screen carries the recovery phrase, and the
 * Bedrock Rule fixes every seed view at `semantic.surface.bedrock`, opaque.
 * That is a security decision, not a stylistic one.
 */
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  normalizeMnemonic,
  semantic,
  spacing,
  validateMnemonic,
} from '@salmon/shared';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { focusRingNone } from '../../theme';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  ReservedSlot,
} from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import type { RecoverWalletPageProps } from './types';

const TextArea = styled('textarea')<{ $borderColor: string }>(({ $borderColor }) => ({
  width: '100%',
  // Relative to the band it sits in rather than a fixed 160px, so a short
  // surface takes it out of `body` — which is the give — instead of pushing
  // the action off the bottom.
  height: '100%',
  minHeight: 0,
  backgroundColor: colors.input.background,
  border: `1px solid ${$borderColor}`,
  borderRadius: borderRadius.lg,
  padding: spacing.lg,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  textAlign: 'center',
  resize: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
  '&::placeholder': {
    color: colors.text.tertiary,
  },
  // This textarea draws its own focus indicator: the 1px border switches to
  // `colors.accent.primary`, which measures 6.26:1 against the page ground
  // and 5.62:1 against its own fill — comfortably past the 3:1 WCAG 2.2
  // 1.4.11 asks of a focus indicator. The theme ring stands down rather than
  // stacking a second outline just inside that border.
  '&:focus-visible:focus-visible:focus-visible': focusRingNone,
}));

export function RecoverWalletPage({
  onComplete,
  onBack,
}: RecoverWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isValidSeedPhrase = useMemo(() => {
    const normalized = normalizeMnemonic(seedPhrase);
    if (!normalized) return false;
    return validateMnemonic(normalized);
  }, [seedPhrase]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSeedPhrase(text);
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!isValidSeedPhrase) return;
    onComplete(normalizeMnemonic(seedPhrase));
  }, [isValidSeedPhrase, onComplete, seedPhrase]);

  return (
    <OnboardingLayout
      testID="recover-screen"
      variant="content"
      backgroundColor={semantic.surface.bedrock}
      chrome={<ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />}
      title={<OnboardingTitle>{t('wallet.recover.messageTitle')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.recover.messageBody')}</OnboardingDescription>}
      body={
        <TextArea
          $borderColor={isFocused ? colors.accent.primary : colors.input.border}
          data-testid="recover-seed-input"
          placeholder={t('wallet.recover.placeholder')}
          value={seedPhrase}
          onChange={(event) => setSeedPhrase(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
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
