/**
 * What the send passage reads off the transaction hook, decided once for both
 * platforms: whether the flow is mid-commit, whether it failed, what the
 * failure surface says, and the wave wait's hold.
 *
 * One wait spans the whole commit, signature through settle, exactly as the
 * sheet spanned it: gated on `isSending` alone it ended at the signature and
 * the receipt raised a second wait of its own for the indexer.
 *
 * `held` already means "committed, or still leaving", so it IS the render
 * condition. Gating on `txId` as well collapsed the branch in the same render
 * a send failed: `visible={false}` was never committed, the exit effect never
 * ran, the front was cut mid-crossing, and `onWaveGone` never fired — leaving
 * `useWaitExit` stuck with `held` true for the life of the flow, so a retry
 * entered on stale state. The failure surface renders over the wait, so its
 * ebb plays out of sight (spec 031 §4).
 */
import { sendFailureReport, type SendFailureReport } from '../utils/send-failure-report';
import type { UseSendTransactionResult } from './useSendTransaction';
import { useWaitExit } from './useWaitExit';

export interface SendCommitState {
  isSending: boolean;
  sendFailed: boolean;
  failure: SendFailureReport;
  /** The wait spans the signature and the settle. */
  isCommitted: boolean;
  /** Render the wait while this holds; pass `onWaveGone` to its `onExited`. */
  isWaveHeld: boolean;
  onWaveGone: () => void;
}

export function useSendCommitState(
  sendHook: Pick<UseSendTransactionResult, 'status' | 'settling' | 'error' | 'errorDetail'>,
  t: (key: string) => string
): SendCommitState {
  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const isCommitted = isSending || sendHook.settling;
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isCommitted);
  return {
    isSending,
    sendFailed: sendHook.status === 'failed',
    failure: sendFailureReport(sendHook, t),
    isCommitted,
    isWaveHeld,
    onWaveGone,
  };
}
