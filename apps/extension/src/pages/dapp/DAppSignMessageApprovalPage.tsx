import React, { useCallback, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const { metadata } = useDAppMetadata(origin);

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
    if (!account || !isSignableSolanaAccount(account)) {
      sendToBackground({ error: 'Solana account not available' });
      onDismiss(false);
      return;
    }

    const data = request.params?.data;
    if (!data || !Array.isArray(data)) {
      sendToBackground({ error: 'Missing message data' });
      onDismiss(false);
      return;
    }

    setLoading(true);
    try {
      const result =
        request.method === 'signOffchain'
          ? await approveSolanaSignOffchainMessage(
              account,
              data,
              request.params?.requiredSigners ?? []
            )
          : await approveSolanaSignMessage(account, data);
      sendToBackground({ result });
      onDismiss(true);
    } catch {
      sendToBackground({ error: 'Message signing failed' });
      onDismiss(false);
    } finally {
      setLoading(false);
    }
  }, [account, onDismiss, request, sendToBackground]);

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
