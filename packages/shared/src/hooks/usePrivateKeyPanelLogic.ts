/**
 * usePrivateKeyPanelLogic — the reveal/copy/reauth state machine shared by
 * the mobile and DOM `PrivateKeyPanel` twins.
 *
 * This hook owns only state transitions around already-derived
 * `AccountKeyInfo[]` — it never fetches or clears key material itself. Each
 * platform still calls `getAccountKeysForNetwork` (which internally reaches
 * `retrieveSecurePrivateKey`) on its own, in the same place and order it did
 * before; this hook does not touch that call. Clipboard I/O is platform
 * territory (`expo-clipboard` vs `navigator.clipboard`), so it is injected
 * as `copyToClipboard`, matching the pattern `useCopyFeedback` already uses.
 *
 * Biometric reveal is optional: passing `biometricAvailable` +
 * `verifyBiometric` reproduces the mobile one-prompt-then-password-fallback
 * flow; omitting them (the DOM twin) always falls through to the password
 * gate, which is exactly what the DOM twin did before this hook existed.
 *
 * @module hooks/usePrivateKeyPanelLogic
 */

import { useCallback, useState } from 'react';
import { useCopyFeedback, type CopyFeedbackKey } from './useCopyFeedback';

export interface UsePrivateKeyPanelLogicParams {
  /** Copies a private key to the clipboard; platform-specific I/O. */
  copyToClipboard: (privateKey: string) => Promise<unknown>;
  /** Called when `copyToClipboard` rejects, before the failure is surfaced. */
  onCopyError?: (error: unknown) => void;
  /** Whether the device can be asked for a biometric verdict. */
  biometricAvailable?: boolean;
  /** Prompts for biometrics and answers whether it was the owner. */
  verifyBiometric?: () => Promise<boolean>;
}

export interface UsePrivateKeyPanelLogicResult {
  revealedIndexes: Set<number>;
  copiedIndex: CopyFeedbackKey | true | null;
  copyFailedIndex: number | null;
  reauthIndex: number | null;
  setReauthIndex: (index: number | null) => void;
  /** Clears reveal/copy/reauth state — call on network change (select or back). */
  resetRevealState: () => void;
  revealKey: (index: number) => void;
  handleReveal: (index: number) => Promise<void>;
  handleReauthenticated: () => Promise<void>;
  handleCopy: (privateKey: string, index: number) => Promise<void>;
}

export function usePrivateKeyPanelLogic({
  copyToClipboard,
  onCopyError,
  biometricAvailable,
  verifyBiometric,
}: UsePrivateKeyPanelLogicParams): UsePrivateKeyPanelLogicResult {
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const { copiedKey: copiedIndex, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null);
  const [reauthIndex, setReauthIndex] = useState<number | null>(null);

  const resetRevealState = useCallback(() => {
    setRevealedIndexes(new Set());
    resetCopied();
    setCopyFailedIndex(null);
    setReauthIndex(null);
  }, [resetCopied]);

  const revealKey = useCallback((index: number) => {
    setRevealedIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  // An unlocked session is not proof of identity — it only proves the phone
  // was left open. Biometrics count as the same proof as the password, so a
  // device that offers them keeps its one-prompt flow; a device without one
  // (or a platform that never passes them in) falls back to typing the
  // password rather than to nothing at all.
  const handleReveal = useCallback(
    async (index: number) => {
      if (biometricAvailable && verifyBiometric) {
        const verified = await verifyBiometric();
        if (!verified) {
          setReauthIndex(index);
          return;
        }
        revealKey(index);
        return;
      }

      setReauthIndex(index);
    },
    [biometricAvailable, verifyBiometric, revealKey]
  );

  const handleReauthenticated = useCallback(async () => {
    if (reauthIndex !== null) revealKey(reauthIndex);
  }, [reauthIndex, revealKey]);

  const handleCopy = useCallback(
    async (privateKey: string, index: number) => {
      if (!revealedIndexes.has(index)) return;

      try {
        await copyToClipboard(privateKey);
        setCopyFailedIndex(null);
        showCopied(index);
      } catch (error) {
        // Surface the failure — a silent no-op looks like a successful copy.
        onCopyError?.(error);
        setCopyFailedIndex(index);
      }
    },
    [revealedIndexes, copyToClipboard, onCopyError, showCopied]
  );

  return {
    revealedIndexes,
    copiedIndex,
    copyFailedIndex,
    reauthIndex,
    setReauthIndex,
    resetRevealState,
    revealKey,
    handleReveal,
    handleReauthenticated,
    handleCopy,
  };
}
