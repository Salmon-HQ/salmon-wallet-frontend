/**
 * The handshake every dApp approval page performs with the background:
 * answer the pending request by id on the extension channel, then dismiss
 * the window. Approval CONTENT — what each page shows and signs — stays in
 * the page; only the plumbing lives here.
 */
import { useCallback, useState } from 'react';

export const BACKGROUND_CHANNEL = 'salmon_extension_background_channel';

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
   */
  const approve = useCallback(
    async (
      run: () => Promise<unknown>,
      { guardError, failureError }: { guardError?: string | null; failureError: string }
    ) => {
      if (guardError) {
        sendToBackground({ error: guardError });
        onDismiss(false);
        return;
      }
      setLoading(true);
      try {
        const result = await run();
        sendToBackground({ result });
        onDismiss(true);
      } catch {
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
