/**
 * useBackupPanelLogic — the reveal/copy/reauth state machine shared by the
 * mobile and DOM `BackupPanel` twins (the settings surface that re-shows a
 * wallet's seed phrase).
 *
 * `getAccountMnemonic` is called here exactly where both twins already
 * called it — once, derived from `activeAccount` — and this hook does not
 * change when it runs or what it returns. Clipboard I/O stays platform
 * territory (`expo-clipboard` vs `navigator.clipboard`), injected as
 * `copyToClipboard`. Biometric reveal is optional: passing
 * `biometricAvailable` + `verifyBiometric` reproduces the mobile
 * one-prompt-then-password-fallback flow; omitting them (the DOM twin)
 * always falls through to the password gate, matching its prior behavior.
 *
 * @module hooks/useBackupPanelLogic
 */

import { useCallback, useMemo, useState } from 'react';
import { useCopyFeedback } from './useCopyFeedback';
import { getAccountMnemonic } from '../utils/account-secret';
import type { Account } from '../types/account';

/** What a covered cell shows. Same character count for every word, so the
 *  covered grid gives away nothing about the phrase's shape. */
export const SEED_WORD_MASK = '••••••';

export interface UseBackupPanelLogicParams {
  activeAccount: Account | null | undefined;
  /** Copies the mnemonic to the clipboard; platform-specific I/O. */
  copyToClipboard: (mnemonic: string) => Promise<unknown>;
  /** Called when `copyToClipboard` rejects, before the failure is surfaced. */
  onCopyError?: (error: unknown) => void;
  /** Whether the device can be asked for a biometric verdict. */
  biometricAvailable?: boolean;
  /** Prompts for biometrics and answers whether it was the owner. */
  verifyBiometric?: () => Promise<boolean>;
}

export interface UseBackupPanelLogicResult {
  mnemonic: string;
  words: string[];
  hasNoMnemonic: boolean;
  shownWords: string[];
  showSeedPhrase: boolean;
  reauthVisible: boolean;
  setReauthVisible: (visible: boolean) => void;
  copied: boolean;
  copyFailed: boolean;
  handleReveal: () => Promise<void>;
  handleReauthenticated: () => Promise<void>;
  handleCopy: () => Promise<void>;
}

export function useBackupPanelLogic({
  activeAccount,
  copyToClipboard,
  onCopyError,
  biometricAvailable,
  verifyBiometric,
}: UseBackupPanelLogicParams): UseBackupPanelLogicResult {
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [reauthVisible, setReauthVisible] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();
  const [copyFailed, setCopyFailed] = useState(false);

  // An account imported from a private key has no seed phrase to back up.
  const mnemonic = useMemo(() => getAccountMnemonic(activeAccount) ?? '', [activeAccount]);
  const words = useMemo(() => mnemonic.split(' ').filter(Boolean), [mnemonic]);
  const hasNoMnemonic = words.length === 0;
  const shownWords = useMemo(
    () => (showSeedPhrase ? words : words.map(() => SEED_WORD_MASK)),
    [showSeedPhrase, words]
  );

  // An unlocked session is not proof of identity — it only proves the phone
  // was left open. Biometrics count as the same proof as the password here,
  // so a device that offers them keeps its one-prompt flow; a device without
  // one (or a platform that never passes them in) falls back to the password
  // gate rather than to nothing at all.
  const handleReveal = useCallback(async () => {
    if (showSeedPhrase) {
      setShowSeedPhrase(false);
      return;
    }

    if (biometricAvailable && verifyBiometric) {
      const verified = await verifyBiometric();
      if (verified) {
        setShowSeedPhrase(true);
        return;
      }
      // Cancelled, unavailable, or the enrolment is gone — fall through to
      // the password gate rather than leaving the tap unanswered.
    }

    setReauthVisible(true);
  }, [showSeedPhrase, biometricAvailable, verifyBiometric]);

  const handleReauthenticated = useCallback(async () => {
    setShowSeedPhrase(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!showSeedPhrase || !mnemonic) return;
    try {
      await copyToClipboard(mnemonic);
      setCopyFailed(false);
      showCopied();
    } catch (error) {
      // A silent copy failure here means the user thinks the seed is saved.
      onCopyError?.(error);
      setCopyFailed(true);
    }
  }, [showSeedPhrase, mnemonic, copyToClipboard, onCopyError, showCopied]);

  return {
    mnemonic,
    words,
    hasNoMnemonic,
    shownWords,
    showSeedPhrase,
    reauthVisible,
    setReauthVisible,
    copied,
    copyFailed,
    handleReveal,
    handleReauthenticated,
    handleCopy,
  };
}
