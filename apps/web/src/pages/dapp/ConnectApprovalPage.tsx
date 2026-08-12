import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DAppConnectApprovalView } from '@salmon/ui';
import {
  isSecureOrigin,
  useDAppMetadata,
  useAccountsContext,
  type DAppConnectApprovalPayload,
  type DAppConnectRequest,
} from '@salmon/shared';
import { getActiveSolanaApprovalAccount } from '@salmon/shared/utils/account';
import { onRequest, sendResponse } from '../../utils/walletBridge';

export function ConnectApprovalPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const origin = searchParams.get('origin') || '';
  const [state, actions] = useAccountsContext();
  const [request, setRequest] = useState<DAppConnectRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

  useEffect(() => {
    const unsubscribe = onRequest((incoming) => {
      if (incoming.requestId === requestId && incoming.request.method === 'connect') {
        setRequest(incoming.request);
      }
    });

    return unsubscribe;
  }, [requestId]);

  const solanaAccount = useMemo(
    () =>
      getActiveSolanaApprovalAccount(
        state.activeAccount,
        state.activeBlockchainAccount,
        state.pathIndex
      ),
    [state.activeAccount, state.activeBlockchainAccount, state.pathIndex]
  );

  const handleApprove = useCallback(async () => {
    if (!solanaAccount || !request) return;

    setLoading(true);
    try {
      await actions.addTrustedApp(
        origin,
        metadata ? { name: metadata.name, icon: metadata.icon } : undefined,
        solanaAccount.network.id
      );
      const payload: DAppConnectApprovalPayload = {
        publicKey: solanaAccount.getReceiveAddress(),
      };
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
        error: 'Failed to approve connection',
      });
      window.close();
    } finally {
      setLoading(false);
    }
  }, [actions, metadata, origin, request, requestId, solanaAccount]);

  const handleReject = useCallback(() => {
    sendResponse({ requestId, approved: false, error: 'User rejected the request' });
    window.close();
  }, [requestId]);

  return (
    <DAppConnectApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      address={solanaAccount?.getReceiveAddress()}
      disabled={!solanaAccount || !request}
      loading={loading}
      showOriginWarning={!isSecureOrigin(origin)}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
