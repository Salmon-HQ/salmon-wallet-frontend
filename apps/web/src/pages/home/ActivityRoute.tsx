import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAccountsContext,
  useBalance,
  useTransactions,
  useUserConfig,
  type NetworkId,
  type Transaction,
} from '@salmon/shared';
import { TransactionHistoryPage, TransactionDetailModal } from '@salmon/ui';

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

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleBack = useCallback(() => navigate('/home'), [navigate]);

  const handleTransactionPress = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
  }, []);

  const handleTransactionDetailClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
  }, []);

  return (
    <>
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
        onTransactionPress={handleTransactionPress}
        onTransactionDetailClick={handleTransactionDetailClick}
      />
      <TransactionDetailModal
        visible={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        developerMode={developerNetworks}
      />
    </>
  );
}
