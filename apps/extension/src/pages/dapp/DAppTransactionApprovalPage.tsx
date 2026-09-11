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

// Direct injected-provider callers can supply cluster names instead of wallet
// network IDs. Only known Solana aliases are equivalent; preserve unknown IDs
// so the approval guard still rejects them.
function canonicalSolanaNetwork(network: string): string {
  switch (network) {
    case 'mainnet':
    case 'mainnet-beta':
    case 'solana:mainnet':
      return 'solana-mainnet';
    case 'devnet':
    case 'solana:devnet':
      return 'solana-devnet';
    case 'testnet':
    case 'solana:testnet':
      return 'solana-testnet';
    default:
      return network;
  }
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
  const { details, feeSol, priorityFeeSol, parsingError, effects, effectsLoading } =
    useSolanaTransactionApproval({
      account: solanaAccount,
      request,
    });

  // The request may name a network; the popup signs and sends on the wallet's
  // active one and never switches on a site's word. A mismatch is surfaced and
  // refused here rather than failing later as an opaque send error.
  const requestedNetwork = request.params?.network;
  const networkMismatch = useMemo(
    () =>
      requestedNetwork && networkId && canonicalSolanaNetwork(requestedNetwork) !== networkId
        ? { requested: requestedNetwork, active: networkId }
        : null,
    [networkId, requestedNetwork]
  );

  const handleApprove = useCallback(
    () =>
      approve(
        () =>
          approveSolanaTransactionRequest(
            account as Parameters<typeof approveSolanaTransactionRequest>[0],
            request
          ),
        {
          guardError: networkMismatch
            ? `Network mismatch: the request targets ${networkMismatch.requested} but the wallet is on ${networkMismatch.active}`
            : !account || !isSignableSolanaAccount(account)
              ? 'Solana account not available'
              : null,
          failureError: 'Transaction approval failed',
        }
      ),
    [account, approve, networkMismatch, request]
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
      priorityFeeSol={priorityFeeSol}
      instructionCount={details?.instructionCount ?? null}
      feePayer={details?.feePayer ?? null}
      recentBlockhash={details?.recentBlockhash ?? null}
      parsingError={parsingError}
      networkMismatch={networkMismatch}
      disabled={!account || !networkId}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
