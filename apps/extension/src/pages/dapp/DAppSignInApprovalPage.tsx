import React, { useCallback, useMemo, useState } from 'react';
import {
  DAppSignInApprovalView,
} from '@salmon/ui';
import {
  approveSolanaSignIn,
  prepareSignInMessage,
  useDAppMetadata,
  type BlockchainAccount,
  type DAppSignInRequest,
} from '@salmon/shared';
import { isSolanaAccount } from '@salmon/shared/utils/account';

interface Props {
  origin: string;
  request: DAppSignInRequest;
  account: BlockchainAccount | undefined;
  onDismiss: (approved: boolean) => void;
}

/**
 * Approval page for native `solana:signIn` (SIWS). The SIWS message previewed
 * and signed here is built by the WALLET from the real `origin` — see
 * `prepareSignInMessage` / `approveSolanaSignIn` in `@salmon/shared`.
 */
export function DAppSignInApprovalPage({
  origin,
  request,
  account,
  onDismiss,
}: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

  const input = request.params?.input;

  // Same builder the signing path uses, so the preview is exactly what gets
  // signed. null when the request is structurally invalid (view blocks approval).
  const prepared = useMemo(() => {
    if (!account || !isSolanaAccount(account)) return null;
    try {
      return prepareSignInMessage(input ?? {}, origin, account.getReceiveAddress());
    } catch {
      return null;
    }
  }, [account, input, origin]);

  const sendToBackground = useCallback((data: Record<string, unknown>) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        channel: 'salmon_extension_background_channel',
        data: {
          ...data,
          id: request.id,
        },
      });
    }
  }, [request.id]);

  const handleReject = useCallback(() => {
    sendToBackground({ error: 'User rejected the request' });
    onDismiss(false);
  }, [onDismiss, sendToBackground]);

  const handleApprove = useCallback(async () => {
    setLoading(true);
    try {
      if (!account || !isSolanaAccount(account)) {
        throw new Error('Solana account not available');
      }

      const result = await approveSolanaSignIn(account, request.params?.input ?? {}, origin);
      sendToBackground({ result });
      onDismiss(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed';
      sendToBackground({ error: message });
      onDismiss(false);
    } finally {
      setLoading(false);
    }
  }, [account, onDismiss, origin, request, sendToBackground]);

  return (
    <DAppSignInApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      siws={prepared?.fields ?? null}
      messageText={prepared?.message ?? ''}
      domainMismatch={prepared?.domainMismatch ?? false}
      requestedDomain={prepared?.requestedDomain}
      isOffchainMessage={!!input?.useOffchainMessage}
      disabled={!account || (prepared?.addressMismatch ?? false)}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
