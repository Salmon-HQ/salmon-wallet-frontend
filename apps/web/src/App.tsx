import React, { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { PendingActivityBanner, WalletLayout } from '@salmon/ui';
import {
  useAccountsContext,
  useInactivityTimeout,
  createQueryClient,
  QueryClientProvider,
  BridgeSettlementProvider,
  PendingTransactionsProvider,
  usePendingActivity,
} from '@salmon/shared';
import { router } from './router';
import { clearSessionKey } from './utils/sessionKeyCache';
import { DAppSettlementBridge } from './providers/DAppSettlementBridge';

function InactivityGuard({ children }: { children: React.ReactNode }) {
  const [state, actions] = useAccountsContext();
  const closeLockTriggeredRef = useRef(false);

  useInactivityTimeout({
    timeoutMs: 5 * 60 * 1000,
    onTimeout: () => {
      void clearSessionKey();
      actions.lockAccounts();
    },
    enabled: state.ready && !state.locked && state.accounts.length > 0,
  });

  useEffect(() => {
    if (!state.ready || state.locked || state.accounts.length === 0) {
      closeLockTriggeredRef.current = false;
      return;
    }

    const handleClose = () => {
      if (closeLockTriggeredRef.current) {
        return;
      }

      closeLockTriggeredRef.current = true;
      void clearSessionKey();
      void actions.lockAccounts();
    };

    window.addEventListener('pagehide', handleClose);
    window.addEventListener('beforeunload', handleClose);

    return () => {
      window.removeEventListener('pagehide', handleClose);
      window.removeEventListener('beforeunload', handleClose);
    };
  }, [actions, state.accounts.length, state.locked, state.ready]);

  return <>{children}</>;
}

/**
 * Global in-flight surface. Mounted above the router so navigating — or
 * locking — never costs the user the outcome of a transaction they signed.
 */
function PendingActivity(): React.ReactElement {
  const { items, dismiss } = usePendingActivity();
  return <PendingActivityBanner items={items} onDismiss={dismiss} />;
}

export function App(): React.ReactElement {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <BridgeSettlementProvider>
        <PendingTransactionsProvider>
          <DAppSettlementBridge />
          <WalletLayout>
            <PendingActivity />
            <InactivityGuard>
              <RouterProvider router={router} />
            </InactivityGuard>
          </WalletLayout>
        </PendingTransactionsProvider>
      </BridgeSettlementProvider>
    </QueryClientProvider>
  );
}
