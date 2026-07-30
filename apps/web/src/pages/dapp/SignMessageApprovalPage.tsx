import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DAppSignMessageApprovalView,
} from '@salmon/ui';
import {
  approveSolanaSignMessage,
  approveSolanaSignOffchainMessage,
  decodeDAppMessage,
  useDAppMetadata,
  useAccountsContext,
  type DAppSignMessageApprovalPayload,
  type DAppSignMessageRequest,
  type DAppSignOffchainMessageApprovalPayload,
  type DAppSignOffchainMessageRequest,
} from '@salmon/shared';
import { getActiveSolanaApprovalAccount } from '@salmon/shared/utils/account';
import { onRequest, sendResponse } from '../../utils/walletBridge';

type SignRequest = DAppSignMessageRequest | DAppSignOffchainMessageRequest;

export function SignMessageApprovalPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const origin = searchParams.get('origin') || '';
  const [state] = useAccountsContext();
  const [request, setRequest] = useState<SignRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

  useEffect(() => {
    const unsubscribe = onRequest((incoming) => {
      if (
        incoming.requestId === requestId &&
        (incoming.request.method === 'sign' || incoming.request.method === 'signOffchain')
      ) {
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

  const messageData = useMemo(() => {
    const data = request?.params?.data;
    if (!data || !Array.isArray(data)) return null;
    return decodeDAppMessage(data);
  }, [request?.params?.data]);

  // Presence of requiredSigners switches the shared view into OCMS mode;
  // undefined keeps the legacy raw-sign rendering (incl. tx-lookalike banner).
  const requiredSigners = useMemo(
    () => (request?.method === 'signOffchain' ? request.params?.requiredSigners ?? [] : undefined),
    [request],
  );

  const handleApprove = useCallback(async () => {
    if (!solanaAccount || !request) return;

    const data = request.params?.data;
    if (!data || !Array.isArray(data)) return;

    setLoading(true);
    try {
      const payload: DAppSignMessageApprovalPayload | DAppSignOffchainMessageApprovalPayload =
        request.method === 'signOffchain'
          ? await approveSolanaSignOffchainMessage(
              solanaAccount,
              data,
              request.params?.requiredSigners ?? [],
            )
          : await approveSolanaSignMessage(solanaAccount, data);
      sendResponse({
        requestId,
        approved: true,
        payload,
      });
      window.close();
    } catch (error) {
      sendResponse({
        requestId,
        approved: false,
        error: error instanceof Error ? error.message : 'Message signing failed',
      });
      window.close();
    } finally {
      setLoading(false);
    }
  }, [request, requestId, solanaAccount]);

  const handleReject = useCallback(() => {
    sendResponse({ requestId, approved: false, error: 'User rejected the request' });
    window.close();
  }, [requestId]);

  return (
    <DAppSignMessageApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      messageText={messageData?.text ?? ''}
      data={request?.params?.data}
      requiredSigners={requiredSigners}
      disabled={!solanaAccount || !messageData}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
