import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DAppTransactionApprovalView } from '@salmon/ui';
import {
  approveSolanaTransactionRequest,
  getDAppTransactionRequestSummary,
  useDAppMetadata,
  useAccountsContext,
  useSolanaTransactionApproval,
  type DAppTransactionRequest,
} from '@salmon/shared';
import { getActiveSolanaApprovalAccount } from '@salmon/shared/utils/account';
import { onRequest, sendResponse, sendSettlementRequest } from '../../utils/walletBridge';

export function SignTransactionApprovalPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const origin = searchParams.get('origin') || '';
  const [state] = useAccountsContext();
  const [request, setRequest] = useState<DAppTransactionRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

  useEffect(() => {
    const unsubscribe = onRequest((incoming) => {
      if (
        incoming.requestId === requestId &&
        (incoming.request.method === 'signTransaction' ||
          incoming.request.method === 'signAllTransactions' ||
          incoming.request.method === 'signAndSendTransaction')
      ) {
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

  const { details, feeSol, parsingError, effects, effectsLoading } = useSolanaTransactionApproval({
    account: solanaAccount,
    request,
  });

  const handleApprove = useCallback(async () => {
    if (!solanaAccount || !request) return;

    setLoading(true);
    try {
      const payload = await approveSolanaTransactionRequest(solanaAccount, request);
      if (request.method === 'signAndSendTransaction') {
        sendSettlementRequest({
          type: 'settle-after-tx',
          accountId: solanaAccount.getReceiveAddress(),
          networkId: solanaAccount.network.id,
          kinds: ['balance', 'transactions'],
        });
      }
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
        error: 'Transaction approval failed',
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
    <DAppTransactionApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      requestSummary={
        request ? getDAppTransactionRequestSummary(request.method) : 'signTransaction'
      }
      effects={effects}
      effectsLoading={effectsLoading}
      feeSol={feeSol}
      instructionCount={details?.instructionCount ?? null}
      feePayer={details?.feePayer ?? null}
      recentBlockhash={details?.recentBlockhash ?? null}
      parsingError={parsingError}
      disabled={!solanaAccount || !request}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
