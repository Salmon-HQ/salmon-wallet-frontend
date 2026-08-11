import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DAppSignInApprovalView,
} from '@salmon/ui';
import {
  approveSolanaSignIn,
  prepareSignInMessage,
  useDAppMetadata,
  useAccountsContext,
  type DAppSignInRequest,
} from '@salmon/shared';
import { getActiveSolanaApprovalAccount } from '@salmon/shared/utils/account';
import { onRequest, sendResponse } from '../../utils/walletBridge';

/**
 * Approval page for native `solana:signIn` (SIWS). The SIWS message previewed
 * and signed here is built by the WALLET from the real `origin` — see
 * `prepareSignInMessage` / `approveSolanaSignIn` in `@salmon/shared`.
 */
export function SignInApprovalPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const origin = searchParams.get('origin') || '';
  const [state] = useAccountsContext();
  const [request, setRequest] = useState<DAppSignInRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

  useEffect(() => {
    const unsubscribe = onRequest((incoming) => {
      if (incoming.requestId === requestId && incoming.request.method === 'signIn') {
        setRequest(incoming.request);
      }
    });

    return unsubscribe;
  }, [requestId]);

  const solanaAccount = useMemo(
    () => getActiveSolanaApprovalAccount(
      state.activeAccount,
      state.activeBlockchainAccount,
      state.pathIndex,
    ),
    [state.activeAccount, state.activeBlockchainAccount, state.pathIndex],
  );

  const input = request?.params?.input;

  // Same builder the signing path uses, so the preview is exactly what gets
  // signed. null when the request is structurally invalid (view blocks approval).
  const prepared = useMemo(() => {
    if (!request || !solanaAccount) return null;
    try {
      return prepareSignInMessage(input ?? {}, origin, solanaAccount.getReceiveAddress());
    } catch {
      return null;
    }
  }, [request, solanaAccount, input, origin]);

  const handleApprove = useCallback(async () => {
    if (!solanaAccount || !request) return;

    setLoading(true);
    try {
      const payload = await approveSolanaSignIn(solanaAccount, request.params?.input ?? {}, origin);
      sendResponse({
        requestId,
        approved: true,
        payload,
      });
      window.close();
    } catch {
      sendResponse({
        requestId,
        approved: false,
        error: 'Sign-in failed',
      });
      window.close();
    } finally {
      setLoading(false);
    }
  }, [origin, request, requestId, solanaAccount]);

  const handleReject = useCallback(() => {
    sendResponse({ requestId, approved: false, error: 'User rejected the request' });
    window.close();
  }, [requestId]);

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
      disabled={!solanaAccount || !request || (prepared?.addressMismatch ?? false)}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
