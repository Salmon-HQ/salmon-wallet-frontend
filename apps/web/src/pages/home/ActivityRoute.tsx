import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAccountsContext,
  useBalance,
  useTransactions,
  useUserConfig,
  type NetworkId,
} from '@salmon/shared';
import { TransactionHistoryPage } from '@salmon/ui';

export function ActivityRoute(): React.ReactElement {
  const navigate = useNavigate();
  const [state] = useAccountsContext();
  const { ready, activeBlockchainAccount, networkId } = state;
  const { developerNetworks } = useUserConfig({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    },
  });

  const accountAddress = activeBlockchainAccount?.getReceiveAddress();

  const { hiddenBalance } = useBalance({
    account: activeBlockchainAccount,
    networkId: networkId as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
  });

  const { transactions, loading, loadingMore, error, hasMore, loadMore, refresh } = useTransactions(
    {
      address: accountAddress,
      networkId: (networkId || 'solana-mainnet') as NetworkId,
      skip: !ready || !activeBlockchainAccount,
      account: activeBlockchainAccount,
    }
  );

  const handleBack = useCallback(() => navigate('/home'), [navigate]);

  return (
    <TransactionHistoryPage
      onBack={handleBack}
      transactions={transactions}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      hiddenBalance={hiddenBalance}
      error={error}
      onRetry={refresh}
      networkId={networkId}
      developerMode={developerNetworks}
    />
  );
}
