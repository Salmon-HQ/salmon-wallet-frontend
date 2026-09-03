import React, { useCallback, useMemo } from 'react';
import { DAppTransactionApprovalView } from '@salmon/ui';
import {
  approveSolanaTransactionRequest,
  getDAppTransactionRequestSummary,
  useDAppMetadata,
  useSolanaTransactionApproval,
  type BlockchainAccount,
  type DAppTransactionRequest,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';
import { useDAppApproval } from './useDAppApproval';

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
  const { metadata } = useDAppMetadata(origin);
  const {
    loading,
    reject: handleReject,
    approve,
  } = useDAppApproval({
    requestId: request.id,
    onDismiss,
  });
  const solanaAccount = useMemo(
    () => (account && isSignableSolanaAccount(account) ? account : null),
    [account]
  );
  const { details, feeSol, parsingError, effects, effectsLoading } = useSolanaTransactionApproval({
    account: solanaAccount,
    request,
  });

  const handleApprove = useCallback(
    () =>
      approve(
        () =>
          approveSolanaTransactionRequest(
            account as Parameters<typeof approveSolanaTransactionRequest>[0],
            request
          ),
        {
          guardError:
            !account || !isSignableSolanaAccount(account) ? 'Solana account not available' : null,
          failureError: 'Transaction approval failed',
        }
      ),
    [account, approve, request]
  );

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
