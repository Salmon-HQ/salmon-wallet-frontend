import React, { useCallback, useMemo } from 'react';
import { DAppSignMessageApprovalView } from '@salmon/ui';
import {
  approveSolanaSignMessage,
  approveSolanaSignOffchainMessage,
  decodeDAppMessage,
  useDAppMetadata,
  type BlockchainAccount,
  type DAppSignMessageRequest,
  type DAppSignOffchainMessageRequest,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';
import { useDAppApproval } from './useDAppApproval';

interface Props {
  origin: string;
  request: DAppSignMessageRequest | DAppSignOffchainMessageRequest;
  account: BlockchainAccount | undefined;
  onDismiss: (approved: boolean) => void;
}

export function DAppSignMessageApprovalPage({
  origin,
  request,
  account,
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

  const messageData = useMemo(() => {
    const data = request.params?.data;
    if (!data || !Array.isArray(data)) return null;
    return decodeDAppMessage(data);
  }, [request.params?.data]);

  // Presence of requiredSigners switches the shared view into OCMS mode;
  // undefined keeps the legacy raw-sign rendering (incl. tx-lookalike banner).
  const requiredSigners = useMemo(
    () => (request.method === 'signOffchain' ? (request.params?.requiredSigners ?? []) : undefined),
    [request]
  );

  const handleApprove = useCallback(() => {
    const data = request.params?.data;
    const signable = !!account && isSignableSolanaAccount(account);
    return approve(
      () =>
        request.method === 'signOffchain'
          ? approveSolanaSignOffchainMessage(
              account as Parameters<typeof approveSolanaSignOffchainMessage>[0],
              data as number[],
              request.params?.requiredSigners ?? []
            )
          : approveSolanaSignMessage(
              account as Parameters<typeof approveSolanaSignMessage>[0],
              data as number[]
            ),
      {
        // Same order as before: the account is checked before the payload.
        guardError: !signable
          ? 'Solana account not available'
          : !data || !Array.isArray(data)
            ? 'Missing message data'
            : null,
        failureError: 'Message signing failed',
      }
    );
  }, [account, approve, request]);

  return (
    <DAppSignMessageApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      messageText={messageData?.text ?? ''}
      data={request.params?.data}
      requiredSigners={requiredSigners}
      disabled={!account || !messageData}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
