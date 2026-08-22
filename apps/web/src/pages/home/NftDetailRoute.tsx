import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  useAccountsContext,
  useNftBurn,
  useSettleAfterTx,
  isSolanaNft,
  createBurnTransaction,
  classifyTransactionError,
  type NftData,
} from '@salmon/shared';
import { isSolanaAccount } from '@salmon/shared/utils/account';
import { NftDetailPage, NftSendDialog } from '@salmon/ui';

export function NftDetailRoute(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const nft = location.state as NftData | null;

  const [state] = useAccountsContext();
  const { activeAccount } = state;

  const [nftSendVisible, setNftSendVisible] = useState(false);
  const [burnStep, setBurnStep] = useState<'idle' | 'review' | 'success'>('idle');
  const [burnPreview, setBurnPreview] = useState<Awaited<
    ReturnType<typeof createBurnTransaction>
  > | null>(null);
  const [burnPreparing, setBurnPreparing] = useState(false);
  const [burnError, setBurnError] = useState<string | null>(null);

  const collectibleSolanaAccount = useMemo(() => {
    const networksAccounts = activeAccount?.networksAccounts;
    if (!networksAccounts) return undefined;

    const preferredNetworkIds = ['solana-mainnet', 'solana-devnet'] as const;
    for (const networkId of preferredNetworkIds) {
      const account = networksAccounts[networkId]?.[0];
      if (account && isSolanaAccount(account)) {
        return account;
      }
    }

    for (const accounts of Object.values(networksAccounts)) {
      for (const account of accounts ?? []) {
        if (account && isSolanaAccount(account)) {
          return account;
        }
      }
    }

    return undefined;
  }, [activeAccount]);

  const settleAfterTx = useSettleAfterTx();
  const nftBurn = useNftBurn({
    account: collectibleSolanaAccount ?? null,
    activeAccountId: activeAccount?.id,
  });

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleSendPress = useCallback(() => {
    setNftSendVisible(true);
  }, []);

  const handleBurnPress = useCallback(() => {
    if (!nft || !isSolanaNft(nft) || !collectibleSolanaAccount) return;

    setBurnStep('review');
    setBurnPreparing(true);
    setBurnPreview(null);
    setBurnError(null);

    const ownerAddress = collectibleSolanaAccount.getReceiveAddress();
    const solAccount = collectibleSolanaAccount;
    createBurnTransaction({
      mintAddress: nft.mint,
      ownerAddress,
    })
      .then(async (txResponse) => {
        setBurnPreview(txResponse);
        if (txResponse.lookupTable) {
          const balance = await solAccount.getCredit();
          if (balance < txResponse.lookupTable.estimatedRentLamports) {
            setBurnError('nft.burn.insufficientFeeSol');
          }
        }
      })
      .catch((err) => {
        setBurnError(classifyTransactionError(err));
      })
      .finally(() => {
        setBurnPreparing(false);
      });
  }, [nft, collectibleSolanaAccount]);

  const handleBurnBack = useCallback(() => {
    setBurnStep('idle');
    setBurnPreparing(false);
    setBurnPreview(null);
    setBurnError(null);
  }, []);

  const confirmBurnNft = useCallback(async () => {
    if (!nft || !isSolanaNft(nft) || !collectibleSolanaAccount || !burnPreview) return;

    try {
      setBurnPreparing(true);
      setBurnError(null);
      await nftBurn.burnNft(burnPreview, nft.mint ?? undefined);
      setBurnStep('success');
    } catch (err) {
      console.error('Failed to burn NFT:', err);
      setBurnError(classifyTransactionError(err));
    } finally {
      setBurnPreparing(false);
    }
  }, [nft, collectibleSolanaAccount, burnPreview, nftBurn]);

  const handleBurnSuccessContinue = useCallback(() => {
    handleBurnBack();
    navigate('/home');
  }, [handleBurnBack, navigate]);

  const handleSendSuccess = useCallback(() => {
    setNftSendVisible(false);
    settleAfterTx({
      accountId: collectibleSolanaAccount?.getReceiveAddress(),
      avatarAccountId: activeAccount?.id,
      networkId: collectibleSolanaAccount?.getNetworkId(),
      kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
    }).catch((err) => {
      console.warn('[NftDetailRoute] settleAfterTx failed:', err);
    });
    navigate('/home');
  }, [activeAccount?.id, collectibleSolanaAccount, navigate, settleAfterTx]);

  // Deep link fallback — no NFT data in location state
  if (!nft) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: colors.background.primary,
          display: 'flex',
          flexDirection: 'column',
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
            marginBottom: spacing.md,
          }}
        >
          {t('nft.notFound', 'NFT not found. Please navigate from your collection.')}
        </Typography>
        <Typography
          component="a"
          onClick={() => navigate('/home')}
          sx={{
            color: colors.accent.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {t('general.go_home', 'Go to Home')}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <NftDetailPage
        nft={nft}
        onBack={handleBack}
        onSendPress={handleSendPress}
        onBurnPress={handleBurnPress}
        burnStep={burnStep}
        burnPreview={burnPreview}
        burnPreparing={burnPreparing}
        burnError={burnError}
        burnSettling={nftBurn.settling}
        onBurnBack={handleBurnBack}
        onBurnConfirm={confirmBurnNft}
        onBurnSuccessContinue={handleBurnSuccessContinue}
      />
      <NftSendDialog
        visible={nftSendVisible}
        onClose={() => setNftSendVisible(false)}
        nft={nft}
        account={collectibleSolanaAccount}
        onSuccess={handleSendSuccess}
      />
    </>
  );
}
