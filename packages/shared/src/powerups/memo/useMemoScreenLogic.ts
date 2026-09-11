/**
 * useMemoScreenLogic — the Memo Powerup's screen state, shared by both twins.
 * Build through the generic path, propose through core, land on Home.
 */
import { useCallback, useState } from 'react';
import i18n from 'i18next';
import { useRequestSignature } from '../../core/confirmation/SignatureRequestContext';
import {
  SignatureRequestCancelledError,
  type TransactionProposal,
} from '../../core/confirmation/types';
import type { SolanaNetworkId } from '../../types/blockchain';
import { buildPowerup, type BuildPowerupFn } from '../backend/api';
import { describePowerupBuildError, type PowerupErrorMessage } from '../backend/errors';
import { toPowerupProposal } from '../backend/proposal';
import type { PowerupBuildEnvelope } from '../backend/types';

export const MEMO_MAX_BYTES = 256;

/** The envelope plus the adapter's typed display fields. */
export interface MemoBuildEnvelope extends PowerupBuildEnvelope {
  note: string;
  noteBytes: number;
}

const MEMO_CODES: Record<string, string> = { note_too_long: 'memo.errors.tooLong' };

export function memoNoteBytes(note: string): number {
  return new TextEncoder().encode(note).length;
}

/** Pure: what core renders for a built memo. */
export function buildMemoProposal(
  envelope: MemoBuildEnvelope,
  networkId: SolanaNetworkId
): TransactionProposal {
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
  return toPowerupProposal(envelope, {
    networkId,
    display: {
      title: t('memo.review.title'),
      rows: [
        { label: t('memo.review.note'), value: envelope.note },
        {
          label: t('memo.review.size'),
          value: t('memo.review.bytes', { count: envelope.noteBytes }),
        },
      ],
      receipt: { title: t('memo.complete') },
      pendingTitle: t('memo.pending'),
      pendingSubtitle: envelope.note,
    },
  });
}

export interface UseMemoScreenLogicParams {
  publicKey: string | null;
  networkId: string | null;
  onNavigateHome?: () => void;
  /** Test seam. */
  buildMemo?: BuildPowerupFn;
}

export interface UseMemoScreenLogicResult {
  note: string;
  setNote: (note: string) => void;
  noteBytes: number;
  canSubmit: boolean;
  isConfirming: boolean;
  error: PowerupErrorMessage | null;
  submit: () => Promise<void>;
}

export function useMemoScreenLogic({
  publicKey,
  networkId,
  onNavigateHome,
  buildMemo = buildPowerup,
}: UseMemoScreenLogicParams): UseMemoScreenLogicResult {
  const requestSignature = useRequestSignature();
  const [note, setNoteState] = useState('');
  const [error, setError] = useState<PowerupErrorMessage | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const noteBytes = memoNoteBytes(note);
  const canSubmit =
    !!publicKey &&
    !!networkId &&
    note.trim().length > 0 &&
    noteBytes <= MEMO_MAX_BYTES &&
    !isConfirming;

  const setNote = useCallback((next: string) => {
    setNoteState(next);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit || !publicKey || !networkId) return;
    setIsConfirming(true);
    setError(null);
    try {
      const envelope = await buildMemo<MemoBuildEnvelope>('memo', networkId, { publicKey, note });
      // Resolves once the user has read core's receipt and closed it.
      await requestSignature(buildMemoProposal(envelope, networkId as SolanaNetworkId));
      setNoteState('');
      onNavigateHome?.();
    } catch (caught) {
      if (!(caught instanceof SignatureRequestCancelledError)) {
        const failure = describePowerupBuildError(caught, {
          codes: MEMO_CODES,
          fallback: 'memo.errors.buildFailed',
        });
        setError(
          failure.kind === 'message' ? failure.message : `swap.unavailable.${failure.reason}`
        );
      }
    } finally {
      setIsConfirming(false);
    }
  }, [canSubmit, publicKey, networkId, note, buildMemo, requestSignature, onNavigateHome]);

  return { note, setNote, noteBytes, canSubmit, isConfirming, error, submit };
}
