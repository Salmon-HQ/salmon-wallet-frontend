import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  type NftData,
  type NftBlockchain,
} from '@salmon/shared';
import { NftSeeAllPage } from '@salmon/ui';

interface NftSeeAllState {
  title: string;
  blockchain: NftBlockchain;
  nfts: NftData[];
}

export function NftSeeAllRoute(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as NftSeeAllState | null;

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleNftPress = useCallback((nft: NftData) => {
    navigate(`/nft/${nft.mint}`, { state: nft });
  }, [navigate]);

  // Deep link fallback — no data in location state
  if (!state) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: colors.background.primary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
      }}>
        <Typography sx={{
          color: colors.text.secondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.lg,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}>
          {t('nft.noCollectionData', 'No collection data available. Please navigate from your collection.')}
        </Typography>
        <Typography
          component="a"
          onClick={() => navigate('/home')}
          sx={{
            color: colors.accent.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.md,
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
    <NftSeeAllPage
      title={state.title}
      blockchain={state.blockchain}
      nfts={state.nfts}
      onNftPress={handleNftPress}
      onBack={handleBack}
    />
  );
}
