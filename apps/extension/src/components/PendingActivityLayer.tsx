import React from 'react';
import { PendingTransactionsProvider, usePendingActivity } from '@salmon/shared';
import { PendingActivityBanner } from '@salmon/ui';

function PendingActivity(): React.ReactElement {
  const { items, dismiss } = usePendingActivity();
  return <PendingActivityBanner items={items} onDismiss={dismiss} />;
}

/**
 * Global in-flight surface for both extension entrypoints.
 *
 * The side panel re-creates its whole React tree (and its QueryClient) on every
 * open, so a swap or send signed before it was closed used to lose its only
 * reporter. The provider rehydrates from storage on mount; this banner is where
 * the user finally sees that.
 *
 * Wrapped once here rather than twice inline so popup and side panel cannot
 * drift apart.
 */
export function PendingActivityLayer({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <PendingTransactionsProvider>
      <PendingActivity />
      {children}
    </PendingTransactionsProvider>
  );
}
