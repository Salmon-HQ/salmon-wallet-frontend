import React, { useCallback, useMemo, useState } from 'react';
import { DAppTransactionApprovalView } from '@salmon/ui';
import {
  approveSolanaTransactionRequest,
  getDAppTransactionRequestSummary,
  useDAppMetadata,
  useSolanaTransactionApproval,
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
  const solanaAccount = useMemo(
    () => (account && isSolanaAccount(account) ? account : null),
    [account]
  );
  const { details, feeSol, parsingError, effects, effectsLoading } = useSolanaTransactionApproval({
    account: solanaAccount,
    request,
  });

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

  return (
    <DAppTransactionApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      requestSummary={getDAppTransactionRequestSummary(request.method)}
      effects={effects}
      effectsLoading={effectsLoading}
      feeSol={feeSol}
      instructionCount={details?.instructionCount ?? null}
      feePayer={details?.feePayer ?? null}
      recentBlockhash={details?.recentBlockhash ?? null}
      parsingError={parsingError}
      disabled={!account || !networkId}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
