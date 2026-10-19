/**
 * The handshake every dApp approval page performs with the background:
 * answer the pending request by id on the extension channel, then dismiss
 * the window. Approval CONTENT — what each page shows and signs — stays in
 * the page; only the plumbing lives here.
 */
import { useCallback, useState } from 'react';
import { getAnalytics, trackEvent } from '@salmon/shared';

export const BACKGROUND_CHANNEL = 'salmon_extension_background_channel';

type DAppApprovalEvent = 'dapp_connected' | 'dapp_message_signed' | 'dapp_transaction_signed';

/**
 * Counts an approval the wallet completed, with nothing about the dApp
 * (FR-011–FR-013). Call it before answering: the background closes this window
 * on the answer, and the flush reaches `fetch` (keepalive) before then.
 */
export function trackDAppApproval(event: DAppApprovalEvent): void {
  // Counting must never turn a completed approval into a failure answer.
  try {
    trackEvent(event);
    void getAnalytics()?.flush();
  } catch {
    // Best-effort analytics.
  }
}

interface UseDAppApprovalParams {
  requestId: string | number;
  onDismiss: (approved: boolean) => void;
}

export function useDAppApproval({ requestId, onDismiss }: UseDAppApprovalParams) {
  const [loading, setLoading] = useState(false);

  const sendToBackground = useCallback(
    (data: Record<string, unknown>) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          channel: BACKGROUND_CHANNEL,
          data: { ...data, id: requestId },
        });
      }
    },
    [requestId]
  );

  const reject = useCallback(() => {
    sendToBackground({ error: 'User rejected the request' });
    onDismiss(false);
  }, [onDismiss, sendToBackground]);

  /**
   * Run the page's approval, report its result, and dismiss. `guardError`
   * short-circuits before anything is signed (a missing account, a malformed
   * request); `failureError` is what the dApp hears if the approval throws.
   * `event` is counted only once `run` has produced the result.
   */
  const approve = useCallback(
    async (
      run: () => Promise<unknown>,
      {
        guardError,
        failureError,
        event,
      }: { guardError?: string | null; failureError: string; event: DAppApprovalEvent }
    ) => {
      if (guardError) {
        sendToBackground({ error: guardError });
        onDismiss(false);
        return;
      }
      setLoading(true);
      try {
        const result = await run();
        trackDAppApproval(event);
        sendToBackground({ result });
        onDismiss(true);
      } catch (error) {
        // The dApp hears the generic text; the real cause stays in the
        // popup's console for whoever is debugging the approval.
        console.error('[dapp-approval]', error);
        sendToBackground({ error: failureError });
        onDismiss(false);
      } finally {
        setLoading(false);
      }
    },
    [onDismiss, sendToBackground]
  );

  return { loading, setLoading, sendToBackground, reject, approve };
}
