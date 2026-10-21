/**
 * The handshake every dApp approval page performs with the background:
 * answer the pending request by id on the extension channel, then dismiss
 * the window. Approval CONTENT — what each page shows and signs — stays in
 * the page; only the plumbing lives here.
 */
import { useCallback, useEffect, useState } from 'react';
import { USER_REJECTED_ERROR } from '../../utils/types';

export const BACKGROUND_CHANNEL = 'salmon_extension_background_channel';

interface UseDAppApprovalParams {
  requestId: string | number;
  onDismiss: (approved: boolean) => void;
  /**
   * Signing requests only: the account the background checked the site's
   * grant against (named in this window's URL), and the one that would sign
   * now. When they differ the request is refused before anything is shown.
   */
  binding?: { approved: string | null; active: string | undefined };
}

export function useDAppApproval({ requestId, onDismiss, binding }: UseDAppApprovalParams) {
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
    sendToBackground({ error: USER_REJECTED_ERROR });
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

  // The same refusal the background gives a site whose grant names another
  // account: it has to connect again.
  const refused = !!binding?.active && binding.active !== binding.approved;
  useEffect(() => {
    if (!refused) return;
    sendToBackground({ error: 'Not connected' });
    onDismiss(false);
  }, [refused, sendToBackground, onDismiss]);

  return { loading, setLoading, sendToBackground, reject, approve, refused };
}
