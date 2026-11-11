/**
 * The create path, on the onboarding slot grid: warning, then phrase. The
 * phrase check waits for the wallet's first send (DEV-208,
 * `PhraseBackupContext`).
 *
 * The mobile twins are `apps/mobile/app/(auth)/seed-warning.tsx` (the
 * warning, a route of its own there) and `apps/mobile/app/(auth)/create.tsx`
 * (the phrase). Same anatomy, same glyphs, same copy.
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
  componentSizes,
  fontFamily,
  fontSize,
  generateMnemonic,
  lineHeight,
  spacing,
  useSecretCopied,
} from '@salmon/shared';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { SparkleIcon, WarningIcon } from '../../icons';
import { secretClipboard } from '../../hooks/useSecretClipboard';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, TextButton } from '../Button';
import { HoldToApproveButton } from '../HoldToApproveButton';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { SeedWordGrid } from '../SeedPhrase';
import type { CreateWalletPageProps } from './types';

type Step = 'message' | 'seedPhrase';

/** Warning, phrase, password — the password screen is the third. */
export const CREATE_FLOW_STEPS = 3;

/** Slop, in px, so a scroll that stops a hair short of the end still counts. */
const END_SLOP = 8;

/** The step glyph fills the top slot: the grid's own mark size for `content`. */
const ICON_SIZE = componentSizes.logoSizeSmall;

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
  // The button itself says the copy is there and for how long; it goes back
  // to "Hold to copy" when the clipboard is cleared.
  const { copied: secretCopied, markCopied } = useSecretCopied();
  const words = mnemonic.split(' ');

  const handleCopy = useCallback(async () => {
    try {
      // Cleared 60 s later, or on the return to the panel (useSecretClipboard).
      await secretClipboard.copy(mnemonic);
      markCopied();
    } catch {
      // Clipboard API may not be available
    }
  }, [mnemonic, markCopied]);

  return (
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
      body={
        // The component gap (`spacing.xl`) between the description and the
        // grid — the "content" variant's compact rung reserves only one
        // description line plus its own buffer, and this screen's copy can
        // wrap to two lines at the extension side panel's narrow widths,
        // eating that buffer and leaving the grid flush under the text.
        <div style={{ paddingTop: spacing.xl }}>
          <SeedWordGrid words={words} columns={3} />
          {/*
              The clipboard warning BackupPanel shows as a card, as one line
              here: the screen must hold the phrase and its three actions
              without scrolling (owner, 2026-11-11).
            */}
          <p
            data-testid="create-seed-clipboard-warning"
            style={{
              margin: 0,
              paddingTop: spacing.md,
              color: text.secondary,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.body,
              lineHeight: `${fontSize.body * lineHeight.snug}px`,
              textAlign: 'center',
            }}
          >
            {t('wallet.create.clipboard_hint')}
          </p>
        </div>
      }
      assist={
        // Same destination as the primary: the check waits for the first
        // send either way. Saying "later" out loud is the honest choice.
        <TextButton onPress={onNext} testID="create-save-later-button">
          {t('wallet.create.save_later')}
        </TextButton>
      }
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
          {secretCopied ? t('wallet.create.copied_clears') : t('wallet.create.hold_to_copy')}
        </HoldToApproveButton>
      }
      action={
        <PrimaryButton onPress={onNext} fullWidth testID="create-backed-up-button">
          {t('wallet.create.saved_it')}
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
    }
  }, [onBack, step]);

  if (step === 'message') {
    return <MessageStep onNext={() => setStep('seedPhrase')} onBack={handleBack} t={t} />;
  }

  return (
    <SeedPhraseStep
      mnemonic={mnemonic}
      onNext={() => onComplete(mnemonic)}
      onBack={handleBack}
      t={t}
    />
  );
}
