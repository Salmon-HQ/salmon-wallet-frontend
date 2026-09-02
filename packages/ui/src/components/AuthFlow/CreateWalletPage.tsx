/**
 * The create path, on the onboarding slot grid: warning, phrase, confirm.
 *
 * ## The warning is a step, not a preamble
 *
 * `wallet.create.messageBody` used to share the screen with nothing and then
 * hand straight over to the phrase. The product owner's reasoning for giving
 * it its own step: "psicológicamente, si muestro una pantalla para esto doy a
 * entender que es importante." A warning that shares a screen with the thing
 * it warns about reads as boilerplate; a warning that costs its own step reads
 * as a gate. So the copy is not shortened, it gets `body` — the flexible slot,
 * and the only one that scrolls — and the action stays disabled until it has
 * actually been scrolled to its end. Advancing costs a deliberate act rather
 * than a thumb landing on a button that was already under it.
 *
 * ## Bedrock, and no water
 *
 * The two screens that carry the recovery phrase paint on
 * `semantic.surface.bedrock`, opaque: no scales, no caustic, no iridescence,
 * nothing alive moving behind the one secret that cannot be reissued. That is
 * a security decision, not a stylistic one.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  componentSizes,
  fontFamily,
  fontSize,
  generateMnemonic,
  generateValidationPositions,
  lineHeight,
  motionMs,
  semantic,
  spacing,
  validateMnemonicWords,
} from '@salmon/shared';
import { SparkleIcon, WarningIcon } from '../../icons';
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
import { HoldToApproveButton } from '../DAppApproval/HoldToApproveButton';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { SeedWordGrid, SeedWordInput } from '../SeedPhrase';
import type { CreateWalletPageProps } from './types';

type Step = 'message' | 'seedPhrase' | 'validate';

/** Warning, phrase, confirm, password — the password screen is the fourth. */
export const CREATE_FLOW_STEPS = 4;

/** Slop, in px, so a scroll that stops a hair short of the end still counts. */
const END_SLOP = 8;

/** The step glyph fills the top slot: the grid's own mark size for `content`. */
const ICON_SIZE = componentSizes.logoSizeSmall;

interface ValidationWord {
  position: number;
  expectedWord: string;
  userInput: string;
}

const WarningCopy = styled(Typography)({
  color: semantic.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
  textAlign: 'center',
  // The copy carries two literal paragraph breaks that MUI's default
  // `white-space: normal` collapsed, so three intended paragraphs rendered as
  // one block.
  whiteSpace: 'pre-line',
});

const ValidationInputs = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
});

const Toast = styled(Box)({
  position: 'fixed',
  bottom: 100,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  backgroundColor: semantic.surface.crest,
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderRadius: spacing['2xl'],
  color: semantic.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
});

function MessageStep({
  onNext,
  onBack,
  t,
}: {
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const [read, setRead] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  /** Copy that fits without scrolling has already been shown in full. */
  const settle = useCallback(() => {
    const node = bodyRef.current;
    if (!node) return;
    if (node.scrollHeight <= node.clientHeight + END_SLOP) setRead(true);
  }, []);

  useEffect(settle, [settle]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - END_SLOP) setRead(true);
  }, []);

  return (
    <OnboardingLayout
      testID="seed-warning-screen"
      variant="content"
      backgroundColor={semantic.surface.bedrock}
      /*
        The warning glyph, in the mark slot — the gate names itself. Mirrors
        the mobile flow (owner, 2026-08-18): the fish stays on welcome and the
        lock only; each flow step wears one semantic glyph, the consent
        screen's pattern and size.
      */
      mark={<WarningIcon size={ICON_SIZE} color={semantic.text.primary} />}
      chrome={
        <ScreenHeader
          onBack={onBack}
          stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 1 }}
        />
      }
      title={<OnboardingTitle>{t('wallet.create.messageTitle')}</OnboardingTitle>}
      body={
        <Box ref={bodyRef} onScroll={handleScroll} sx={{ overflowY: 'auto', minHeight: 0 }}>
          <WarningCopy>{t('wallet.create.messageBody')}</WarningCopy>
        </Box>
      }
      action={
        <PrimaryButton
          onPress={onNext}
          disabled={!read}
          fullWidth
          testID="seed-warning-continue-button"
        >
          {t('actions.start')}
        </PrimaryButton>
      }
    />
  );
}

function SeedPhraseStep({
  mnemonic,
  onNext,
  onBack,
  t,
}: {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const [showToast, setShowToast] = useState(false);
  const words = mnemonic.split(' ');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setShowToast(true);
      setTimeout(() => setShowToast(false), motionMs.feedbackHold);
    } catch {
      // Clipboard API may not be available
    }
  }, [mnemonic]);

  return (
    <>
      <OnboardingLayout
        testID="create-seed-screen"
        variant="content"
        backgroundColor={semantic.surface.bedrock}
        scrollBody
        // The sparkle: something new coming into being. See the warning
        // phase's mark note above.
        mark={<SparkleIcon size={ICON_SIZE} color={semantic.text.primary} />}
        chrome={
          <ScreenHeader
            onBack={onBack}
            stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 2 }}
          />
        }
        title={<OnboardingTitle>{t('wallet.create.your_seed_phrase')}</OnboardingTitle>}
        description={
          <OnboardingDescription>{t('wallet.create.your_seed_phrase_body')}</OnboardingDescription>
        }
        body={<SeedWordGrid words={words} columns={3} />}
        secondary={
          /*
            Held, not tapped: the phrase lands on the clipboard, where anything
            can read it, so the copy costs the same deliberate half-second as
            signing does. The keyboard path commits immediately per WCAG, as
            the hold control already provides.
          */
          <HoldToApproveButton
            onApprove={handleCopy}
            variant="secondary"
            testID="create-copy-seed-button"
          >
            {t('wallet.create.hold_to_copy')}
          </HoldToApproveButton>
        }
        action={
          <PrimaryButton onPress={onNext} fullWidth testID="create-backed-up-button">
            {t('wallet.create.ive_backed_up_seed_phrase')}
          </PrimaryButton>
        }
      />
      {showToast && <Toast>{t('wallet.copied')}</Toast>}
    </>
  );
}

function ValidateStep({
  mnemonic,
  onComplete,
  onBack,
  t,
}: {
  mnemonic: string;
  onComplete: () => void;
  onBack: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}) {
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const [validationWords, setValidationWords] = useState<ValidationWord[]>([]);

  useEffect(() => {
    const positions = generateValidationPositions(words.length, 3);
    setValidationWords(
      positions.map((position) => ({
        position,
        expectedWord: words[position - 1],
        userInput: '',
      }))
    );
  }, [words]);

  const validationResult = useMemo(() => {
    if (validationWords.length === 0) return { isValid: false, results: [] };
    return validateMnemonicWords(
      mnemonic,
      validationWords.map((word) => word.position),
      validationWords.map((word) => word.userInput)
    );
  }, [mnemonic, validationWords]);

  const handleInputChange = useCallback((index: number, value: string) => {
    setValidationWords((prev) =>
      prev.map((word, currentIndex) =>
        currentIndex === index ? { ...word, userInput: value } : word
      )
    );
  }, []);

  const getValidationState = useCallback(
    (index: number): 'idle' | 'correct' | 'incorrect' => {
      const word = validationWords[index];
      if (!word || !word.userInput) return 'idle';
      const result = validationResult.results[index];
      if (!result) return 'idle';
      return result.isCorrect ? 'correct' : 'incorrect';
    },
    [validationResult, validationWords]
  );

  return (
    <OnboardingLayout
      testID="create-validate-screen"
      variant="content"
      backgroundColor={semantic.surface.bedrock}
      scrollBody
      // Same glyph as the phrase it confirms — the step dots carry which half
      // of the creation this is.
      mark={<SparkleIcon size={ICON_SIZE} color={semantic.text.primary} />}
      chrome={
        <ScreenHeader
          onBack={onBack}
          stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 3 }}
        />
      }
      title={<OnboardingTitle>{t('wallet.create.confirm_seed_phrase')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.create.confirm_seed_phrase_body')}</OnboardingDescription>
      }
      body={
        <ValidationInputs>
          {validationWords.map((word, index) => (
            <SeedWordInput
              key={`word-${word.position}`}
              testID={`create-confirm-word-input-${word.position}`}
              position={word.position}
              value={word.userInput}
              onChangeText={(value) => handleInputChange(index, value)}
              validationState={getValidationState(index)}
              autoFocus={index === 0}
              onSubmitEditing={() => {
                if (index === validationWords.length - 1 && validationResult.isValid) {
                  onComplete();
                }
              }}
            />
          ))}
        </ValidationInputs>
      }
      action={
        <PrimaryButton
          onPress={onComplete}
          disabled={!validationResult.isValid}
          fullWidth
          testID="create-next-button"
        >
          {t('actions.next')}
        </PrimaryButton>
      }
    />
  );
}

export function CreateWalletPage({
  onComplete,
  onBack,
}: CreateWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('message');
  // Generated once, on arrival. It used to be generated by the "Start" press
  // on the warning step; generating here keeps the phrase shown and the phrase
  // handed on the same one regardless of how the steps are re-entered.
  const [mnemonic] = useState<string>(() => generateMnemonic(128));

  const handleBack = useCallback(() => {
    switch (step) {
      case 'message':
        onBack();
        break;
      case 'seedPhrase':
        setStep('message');
        break;
      case 'validate':
        setStep('seedPhrase');
        break;
    }
  }, [onBack, step]);

  if (step === 'message') {
    return <MessageStep onNext={() => setStep('seedPhrase')} onBack={handleBack} t={t} />;
  }

  if (step === 'seedPhrase') {
    return (
      <SeedPhraseStep
        mnemonic={mnemonic}
        onNext={() => setStep('validate')}
        onBack={handleBack}
        t={t}
      />
    );
  }

  return (
    <ValidateStep
      mnemonic={mnemonic}
      onComplete={() => onComplete(mnemonic)}
      onBack={handleBack}
      t={t}
    />
  );
}
