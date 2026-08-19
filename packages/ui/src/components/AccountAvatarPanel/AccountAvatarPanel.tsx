/**
 * AccountAvatarPanel - Avatar / Profile Picture selection
 *
 * Displays two tabs:
 * - Presets: Grid of 25 preset Salmon avatars
 * - NFTs: Grid of user's NFT collectibles
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  componentSizes,
  duration,
  easing,
  PRESET_AVATAR_URLS,
  useAccountsContext,
  useAvatarNfts,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { PrimaryButton } from '../Button';
import type { AccountAvatarPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const ToggleContainer = styled(Box)({
  display: 'flex',
  margin: `0 ${spacing.lg}px`,
  marginBottom: spacing.lg,
  backgroundColor: colors.background.tertiary,
  // The tab strip is a control, not a pill (DESIGN.md §The Control Radius Rule).
  borderRadius: borderRadius.r3,
  position: 'relative',
  padding: spacing.xxs,
});

const ToggleHighlight = styled(Box)<{ $isRight?: boolean }>(({ $isRight }) => ({
  position: 'absolute',
  top: spacing.xxs,
  left: $isRight ? '50%' : spacing.xxs,
  width: `calc(50% - ${spacing.xxs}px)`,
  height: `calc(100% - ${spacing.xxs * 2}px)`,
  backgroundColor: colors.accent.primary,
  // The step below the control radius, so the highlight nests inside the
  // strip's corner instead of being derived by arithmetic from it.
  borderRadius: borderRadius.r2,
  transition: `left ${duration.medium} ${easing.ease}`,
}));

const ToggleButton = styled('button')<{ $isActive?: boolean }>(({ $isActive }) => ({
  flex: 1,
  position: 'relative',
  zIndex: 1,
  background: 'none',
  border: 'none',
  padding: `${spacing.sm}px 0`,
  cursor: 'pointer',
  fontWeight: fontWeight.semibold,
  fontSize: fontSize.body,
  color: $isActive ? colors.text.primary : colors.text.secondary,
  textAlign: 'center',
  transition: `color ${duration.medium} ${easing.ease}`,
  fontFamily: fontFamily.sans,
}));

const Grid = styled(Box)({
  display: 'grid',
  padding: `0 ${spacing.lg}px`,
  gap: spacing.sm,
});

const PresetGrid = styled(Grid)({
  gridTemplateColumns: 'repeat(5, 1fr)',
});

const NftGrid = styled(Grid)({
  gridTemplateColumns: 'repeat(3, 1fr)',
});

const AvatarCircle = styled('button')<{ $isSelected?: boolean }>(({ $isSelected }) => ({
  width: '100%',
  aspectRatio: '1',
  borderRadius: '50%',
  overflow: 'hidden',
  border: `${borderWidth.heavy}px solid ${$isSelected ? colors.accent.primary : 'transparent'}`,
  padding: 0,
  cursor: 'pointer',
  background: 'none',
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    // `border.raised` is the plane-correct stroke above `surface.shelf`
    // (DESIGN.md §Colors); the raw white wash it replaces was the last
    // hardcoded colour on this surface.
    borderColor: $isSelected ? colors.accent.primary : semantic.border.raised,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
}));

const NftCardButton = styled('button')<{ $isSelected?: boolean }>(({ $isSelected }) => ({
  width: '100%',
  aspectRatio: '1',
  borderRadius: borderRadius.r3,
  overflow: 'hidden',
  border: `${borderWidth.heavy}px solid ${$isSelected ? colors.accent.primary : 'transparent'}`,
  padding: 0,
  cursor: 'pointer',
  background: 'none',
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    // `border.raised` is the plane-correct stroke above `surface.shelf`
    // (DESIGN.md §Colors); the raw white wash it replaces was the last
    // hardcoded colour on this surface.
    borderColor: $isSelected ? colors.accent.primary : semantic.border.raised,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

/** The committing action is the system's own primary button; this only places it. */
const SaveSlot = styled(Box)({
  padding: `${spacing.lg}px ${spacing.lg}px 0`,
});

const EmptyState = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['3xl']}px`,
});

const LoadingState = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['3xl']}px`,
});

const ScrollContent = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
});

// ============================================================================
// Component
// ============================================================================

/** Stable ids so each tab can point at the one panel it controls. */
const PRESETS_TAB_ID = 'avatar-tab-presets';
const NFTS_TAB_ID = 'avatar-tab-nfts';
const TAB_PANEL_ID = 'avatar-tab-panel';

export function AccountAvatarPanel({ onBack }: AccountAvatarPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const { activeAccount } = state;

  const [activeTab, setActiveTab] = useState<'presets' | 'nfts'>('presets');
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(activeAccount?.avatar);

  const { nfts, loading: nftsLoading } = useAvatarNfts({
    account: activeAccount,
    enabled: activeTab === 'nfts',
  });

  const hasChanged = selectedUrl !== activeAccount?.avatar;

  const handleSave = useCallback(async () => {
    if (activeAccount && selectedUrl && hasChanged) {
      await actions.editAccount(activeAccount.id, { avatar: selectedUrl });
      onBack();
    }
  }, [activeAccount, selectedUrl, hasChanged, actions, onBack]);

  if (!activeAccount) return <div />;

  return (
    <SettingsPanelContent title={t('settings.profile_picture')} onBack={onBack}>
      {/* Toggle */}
      <ToggleContainer role="tablist">
        <ToggleHighlight $isRight={activeTab === 'nfts'} />
        {/* The sliding highlight says which tab is chosen to the eye only. The
            tab roles and `aria-selected` say it to a screen reader, which is a
            product commitment at full scope (PRODUCT.md). */}
        <ToggleButton
          type="button"
          role="tab"
          id={PRESETS_TAB_ID}
          aria-selected={activeTab === 'presets'}
          aria-controls={TAB_PANEL_ID}
          $isActive={activeTab === 'presets'}
          onClick={() => setActiveTab('presets')}
          data-testid="avatar-tab-presets"
        >
          {t('settings.avatar_presets')}
        </ToggleButton>
        <ToggleButton
          type="button"
          role="tab"
          id={NFTS_TAB_ID}
          aria-selected={activeTab === 'nfts'}
          aria-controls={TAB_PANEL_ID}
          $isActive={activeTab === 'nfts'}
          onClick={() => setActiveTab('nfts')}
          data-testid="avatar-tab-nfts"
        >
          {t('settings.avatar_nfts')}
        </ToggleButton>
      </ToggleContainer>

      {/* Content */}
      <ScrollContent
        id={TAB_PANEL_ID}
        role="tabpanel"
        aria-labelledby={activeTab === 'presets' ? PRESETS_TAB_ID : NFTS_TAB_ID}
      >
        {activeTab === 'presets' ? (
          <PresetGrid>
            {PRESET_AVATAR_URLS.map((url, index) => (
              <AvatarCircle
                key={index}
                type="button"
                aria-pressed={selectedUrl === url}
                $isSelected={selectedUrl === url}
                onClick={() => setSelectedUrl(url)}
                data-testid={`avatar-preset-${index}`}
              >
                <img src={url} alt={`Avatar ${index}`} loading="lazy" />
              </AvatarCircle>
            ))}
          </PresetGrid>
        ) : nftsLoading ? (
          <LoadingState>
            <CircularProgress
              size={componentSizes.iconSizeLarge}
              sx={{ color: colors.accent.primary }}
            />
          </LoadingState>
        ) : nfts.length === 0 ? (
          <EmptyState>
            <Typography sx={{ color: colors.text.secondary, fontSize: fontSize.body }}>
              {t('settings.avatar_empty_nfts')}
            </Typography>
          </EmptyState>
        ) : (
          <NftGrid>
            {nfts.map((nft) => (
              <NftCardButton
                key={nft.mint}
                type="button"
                aria-pressed={selectedUrl === nft.image}
                $isSelected={selectedUrl === nft.image}
                onClick={() => nft.image && setSelectedUrl(nft.image)}
                data-testid={`avatar-nft-${nft.mint}`}
              >
                <img src={nft.image} alt={nft.name} loading="lazy" />
              </NftCardButton>
            ))}
          </NftGrid>
        )}
      </ScrollContent>

      {/* Save Button */}
      <SaveSlot>
        <PrimaryButton disabled={!hasChanged} onClick={handleSave} testID="avatar-save-button">
          {t('actions.save')}
        </PrimaryButton>
      </SaveSlot>
    </SettingsPanelContent>
  );
}
