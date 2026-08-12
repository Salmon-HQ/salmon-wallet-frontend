import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  useAccountsContext,
  useBalance,
  useUserConfig,
  getBlockchainFromNetworkId,
  type NetworkId,
  type SendToken,
} from '@salmon/shared';
import { SendPage } from '@salmon/ui';

export function SendRoute(): React.ReactElement {
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

  const { tokens } = useBalance({
    account: activeBlockchainAccount,
    networkId: networkId as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
    includeSpam: !!developerNetworks,
  });

  const blockchain = useMemo(() => {
    if (!networkId) return getBlockchainFromNetworkId('solana');
    const parts = networkId.split('-');
    return getBlockchainFromNetworkId(parts[0] || 'solana');
  }, [networkId]);

  // BE filters unknown-only-tagged SPL tokens; developer mode opts in
  // via `includeSpam` on `useBalance` above.
  const formattedTokens: SendToken[] = useMemo(() => {
    return tokens.map((token) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      logo: token.logo ?? undefined,
      price: token.price,
      uiAmount: token.uiAmount,
      usdBalance: token.usdBalance,
      last24HoursChange:
        token.priceChange24h !== undefined ? { perc: token.priceChange24h } : undefined,
      tags: token.tags,
      coingeckoId: token.coingeckoId,
      decimals: token.decimals,
    }));
  }, [tokens]);

  const handleBack = useCallback(() => navigate('/home'), [navigate]);
  const handleSuccess = useCallback(() => navigate('/home'), [navigate]);

  if (!activeBlockchainAccount) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: colors.background.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing['2xl'],
        }}
      >
        <Typography
          sx={{
            color: colors.text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.lg,
            textAlign: 'center',
          }}
        >
          No account available
        </Typography>
      </Box>
    );
  }

  return (
    <SendPage
      tokens={formattedTokens}
      blockchain={blockchain}
      account={activeBlockchainAccount}
      onBack={handleBack}
      onSuccess={handleSuccess}
      showUnverifiedTokens={developerNetworks}
    />
  );
}
