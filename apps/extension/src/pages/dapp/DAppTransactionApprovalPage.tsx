import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DAppTransactionApprovalView } from '@salmon/ui';
import {
  approveSolanaTransactionRequest,
  getDAppTransactionRequestSummary,
  loadSolanaTransactionApprovalDetails,
  useDAppMetadata,
  type BlockchainAccount,
  type DAppTransactionRequest,
} from '@salmon/shared';
import { isSolanaAccount } from '@salmon/shared/utils/account';

interface Props {
  origin: string;
  request: DAppTransactionRequest;
  account: BlockchainAccount | undefined;
  networkId: string | null;
  onDismiss: (approved: boolean) => void;
}

export function DAppTransactionApprovalPage({
  origin,
  request,
  account,
  networkId,
  onDismiss,
}: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [feeLamports, setFeeLamports] = useState<number | null>(null);
  const [instructionCount, setInstructionCount] = useState<number | null>(null);
  const [feePayer, setFeePayer] = useState<string | null>(null);
  const [recentBlockhash, setRecentBlockhash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setParsingError(null);
      setFeeLamports(null);
      setInstructionCount(null);
      setFeePayer(null);
      setRecentBlockhash(null);

      if (!account || !isSolanaAccount(account)) return;

      try {
        const details = await loadSolanaTransactionApprovalDetails(account, request);
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
  }, [account, request]);

  const sendToBackground = useCallback(
    (data: Record<string, unknown>) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          channel: 'salmon_extension_background_channel',
          data: {
            ...data,
            id: request.id,
          },
        });
      }
    },
    [request.id]
  );

  const handleReject = useCallback(() => {
    sendToBackground({ error: 'User rejected the request' });
    onDismiss(false);
  }, [onDismiss, sendToBackground]);

  const handleApprove = useCallback(async () => {
    if (!account || !isSolanaAccount(account)) {
      sendToBackground({ error: 'Solana account not available' });
      onDismiss(false);
      return;
    }

    setLoading(true);
    try {
      const result = await approveSolanaTransactionRequest(account, request);
      sendToBackground({ result });
      onDismiss(true);
    } catch {
      sendToBackground({ error: 'Transaction approval failed' });
      onDismiss(false);
    } finally {
      setLoading(false);
    }
  }, [account, onDismiss, request, sendToBackground]);

  const feeSol = useMemo(() => {
    if (feeLamports == null) return null;
    return (feeLamports / 1_000_000_000).toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  }, [feeLamports]);

  return (
    <DAppTransactionApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      requestSummary={getDAppTransactionRequestSummary(request.method)}
      feeSol={feeSol}
      instructionCount={instructionCount}
      feePayer={feePayer}
      recentBlockhash={recentBlockhash}
      parsingError={parsingError}
      disabled={!account || !networkId}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
