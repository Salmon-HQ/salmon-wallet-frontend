import React, { useCallback, useMemo } from 'react';
import { DAppSignInApprovalView } from '@salmon/ui';
import {
  approveSolanaSignIn,
  prepareSignInMessage,
  useDAppMetadata,
  type BlockchainAccount,
  type DAppSignInRequest,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';
import { useDAppApproval } from './useDAppApproval';

interface Props {
  origin: string;
  request: DAppSignInRequest;
  account: BlockchainAccount | undefined;
  onDismiss: (approved: boolean) => void;
}

/**
 * Approval page for native `solana:signIn` (SIWS). The SIWS message previewed
 * and signed here is built by the WALLET from the real `origin` — see
 * `prepareSignInMessage` / `approveSolanaSignIn` in `@salmon/shared`.
 */
export function DAppSignInApprovalPage({
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

  const input = request.params?.input;

  // Same builder the signing path uses, so the preview is exactly what gets
  // signed. null when the request is structurally invalid (view blocks approval).
  const prepared = useMemo(() => {
    if (!account || !isSignableSolanaAccount(account)) return null;
    try {
      return prepareSignInMessage(input ?? {}, origin, account.getReceiveAddress());
    } catch {
      return null;
    }
  }, [account, input, origin]);

  const handleApprove = useCallback(
    () =>
      approve(
        () =>
          approveSolanaSignIn(
            account as Parameters<typeof approveSolanaSignIn>[0],
            request.params?.input ?? {},
            origin
          ),
        {
          guardError:
            !account || !isSignableSolanaAccount(account) ? 'Solana account not available' : null,
          failureError: 'Sign-in failed',
        }
      ),
    [account, approve, origin, request]
  );

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
      disabled={!account || (prepared?.addressMismatch ?? false)}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}
