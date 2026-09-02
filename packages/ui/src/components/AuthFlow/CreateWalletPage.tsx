/**
 * The create path, on the onboarding slot grid: warning, phrase, confirm.
 *
 * The mobile twins are `apps/mobile/app/(auth)/seed-warning.tsx` (the
 * warning, a route of its own there) and `apps/mobile/app/(auth)/create.tsx`
 * (phrase and confirm). Same anatomy, same glyphs, same copy.
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
 * The three screens that exhibit the recovery phrase paint on
 * `surface.bedrock`, opaque: no scales, no caustic, no iridescence, nothing
 * alive moving behind the one secret that cannot be reissued. That is a
 * security decision, not a stylistic one.
 */
import {
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  generateMnemonic,
  generateValidationPositions,
  lineHeight,
  motionMs,
  spacing,
  validateMnemonicWords,
} from '@salmon/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CheckCircleIcon, iconSize, SparkleIcon, WarningIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
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

function MessageStep({
  onNext,
  onBack,
  t,
}: {
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  const { surface, text } = useSemantic();
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

  const copy: CSSProperties = {
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyLg,
    lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
    // The copy carries two literal paragraph breaks; without this the three
    // intended paragraphs collapse into one block.
    whiteSpace: 'pre-line',
  };

  return (
    <OnboardingLayout
      testID="seed-warning-screen"
      variant="content"
      backgroundColor={surface.bedrock}
      /*
        The warning glyph, in the mark slot — the gate names itself. Mirrors
        mobile (owner, 2026-08-18): the fish stays on welcome and the lock
        only; each flow step wears one semantic glyph.
      */
      mark={<WarningIcon size={ICON_SIZE} color={text.primary} />}
      chrome={
        <ScreenHeader
          onBack={onBack}
          stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 1 }}
        />
      }
      title={<OnboardingTitle>{t('wallet.create.messageTitle')}</OnboardingTitle>}
      body={
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          style={{
            overflowY: 'auto',
            minHeight: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p style={copy}>{t('wallet.create.messageBody')}</p>
        </div>
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

/**
 * The copy confirmation — mobile's toast: the success glyph and the line, on
 * the backdrop scrim, floating over the action.
 */
function Toast({ message }: { message: string }) {
  const { overlay, status, text } = useSemantic();
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 100,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: overlay.backdrop,
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderRadius: borderRadius['2xl'],
        }}
      >
        <CheckCircleIcon size={iconSize.md} color={status.success} />
        <span
          style={{
            color: text.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.body,
            lineHeight: `${Math.round(fontSize.body * lineHeight.snug)}px`,
          }}
        >
          {message}
        </span>
      </div>
    </div>
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
  const { surface, text } = useSemantic();
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
        backgroundColor={surface.bedrock}
        scrollBody
        // The sparkle: something new coming into being. See the warning
        // phase's mark note above.
        mark={<SparkleIcon size={ICON_SIZE} color={text.primary} />}
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
      {showToast && <Toast message={t('wallet.copied')} />}
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
  const { surface, text } = useSemantic();
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
      backgroundColor={surface.bedrock}
      scrollBody
      // Same glyph as the phrase it confirms — the step dots carry which half
      // of the creation this is.
      mark={<SparkleIcon size={ICON_SIZE} color={text.primary} />}
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
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
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
        </div>
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
