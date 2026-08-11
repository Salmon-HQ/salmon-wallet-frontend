import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DAppTransactionApprovalView,
} from '@salmon/ui';
import {
  approveSolanaTransactionRequest,
  getDAppTransactionRequestSummary,
  loadSolanaTransactionApprovalDetails,
  useDAppMetadata,
  useAccountsContext,
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
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [feeLamports, setFeeLamports] = useState<number | null>(null);
  const [instructionCount, setInstructionCount] = useState<number | null>(null);
  const [feePayer, setFeePayer] = useState<string | null>(null);
  const [recentBlockhash, setRecentBlockhash] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onRequest((incoming) => {
      if (
        incoming.requestId === requestId &&
        (
          incoming.request.method === 'signTransaction' ||
          incoming.request.method === 'signAllTransactions' ||
          incoming.request.method === 'signAndSendTransaction'
        )
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setParsingError(null);
      setFeeLamports(null);
      setInstructionCount(null);
      setFeePayer(null);
      setRecentBlockhash(null);

      if (!solanaAccount || !request) return;

      try {
        const details = await loadSolanaTransactionApprovalDetails(solanaAccount, request);
        if (cancelled) return;

        setFeeLamports(details.feeLamports);
        setInstructionCount(details.instructionCount);
        setFeePayer(details.feePayer);
        setRecentBlockhash(details.recentBlockhash);
      } catch {
        if (cancelled) return;
        setParsingError('Failed to decode transaction');
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [request, solanaAccount]);

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

  const feeSol = useMemo(() => {
    if (feeLamports == null) return null;
    return (feeLamports / 1_000_000_000).toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  }, [feeLamports]);

  return (
    <DAppTransactionApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      requestSummary={request ? getDAppTransactionRequestSummary(request.method) : 'signTransaction'}
      feeSol={feeSol}
      instructionCount={instructionCount}
      feePayer={feePayer}
      recentBlockhash={recentBlockhash}
      parsingError={parsingError}
      disabled={!solanaAccount || !request}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
