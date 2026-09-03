import React, { useCallback } from 'react';
import { DAppConnectApprovalView } from '@salmon/ui';
import { useDAppMetadata, type TrustedApp } from '@salmon/shared';
import type { DAppConnectRequest } from '@salmon/shared';
import { useDAppApproval } from './useDAppApproval';

interface DAppConnectPageProps {
  origin: string;
  request: DAppConnectRequest;
  address: string;
  networkId: string | null;
  onApprove: (origin: string, app?: TrustedApp) => Promise<void>;
  onDeny: () => void;
  onDismiss: () => void;
}

export function DAppConnectPage({
  origin,
  request,
  address,
  networkId,
  onApprove,
  onDeny,
  onDismiss,
}: DAppConnectPageProps): React.ReactElement {
  const { metadata } = useDAppMetadata(origin);
  const { loading, setLoading, sendToBackground } = useDAppApproval({
    requestId: request.id,
    // The connect window has its own dismiss pair (onDeny + onDismiss);
    // the shared reject is not used here.
    onDismiss: () => {},
  });

  const handleApprove = useCallback(async () => {
    setLoading(true);
    try {
      await onApprove(origin, metadata ? { name: metadata.name, icon: metadata.icon } : undefined);
      sendToBackground({ method: 'connected', params: { publicKey: address } });
      onDismiss();
    } catch (err) {
      console.error('[Salmon] DApp connect approve failed:', err);
      sendToBackground({ error: 'Failed to approve connection' });
      onDismiss();
    } finally {
      setLoading(false);
    }
  }, [address, metadata, onApprove, onDismiss, origin, sendToBackground, setLoading]);

  const handleReject = useCallback(() => {
    sendToBackground({ error: 'User rejected the request' });
    onDeny();
    onDismiss();
  }, [onDeny, onDismiss, sendToBackground]);

  return (
    <DAppConnectApprovalView
      origin={origin}
      appName={metadata?.name}
      appIcon={metadata?.icon}
      address={address}
      disabled={!address || !networkId}
      loading={loading}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}

export default DAppConnectPage;
