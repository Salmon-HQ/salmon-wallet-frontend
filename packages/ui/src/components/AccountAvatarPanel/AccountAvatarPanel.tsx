/**
 * AccountAvatarPanel — the profile picture, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountAvatarPanel`:
 * two surfaces under a travelling underline — the preset grid and the
 * user's NFTs — and the save button. Lateral choice takes the underline,
 * never a boxed or filled container (DESIGN.md §Navigation).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  motionEasing,
  motionMs,
  PRESET_AVATAR_URLS,
  spacing,
  useAvatarPicker,
  type AvatarPickerTab,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { SkeletonRow } from '../SkeletonRow';
import { UnderlineTabs } from '../UnderlineTabs';
import type { AccountAvatarPanelProps } from './types';

/** The grid steps mobile draws: presets four to five across, NFTs two to three. */
const PRESET_MIN_SIZE = 56;
const NFT_MIN_SIZE = 96;
const GRID_GAP = spacing.sm;

export function AccountAvatarPanel({
  currentAvatarUrl,
  account,
  onSave,
  onBack,
}: AccountAvatarPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { state: stateTokens, text } = useSemantic();

  const {
    activeTab,
    setActiveTab,
    selectedUrl,
    setSelectedUrl,
    nfts,
    nftsLoading,
    hasChanged,
    save: handleSave,
  } = useAvatarPicker({ currentAvatarUrl, account, onSave });

  const tile = (selected: boolean, round: boolean): React.CSSProperties => ({
    width: '100%',
    aspectRatio: '1',
    padding: 0,
    margin: 0,
    background: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    borderRadius: round ? '50%' : borderRadius.r2,
    borderStyle: 'solid',
    borderWidth: borderWidth.medium,
    borderColor: selected ? stateTokens.selectedEdge : 'transparent',
    transition: `border-color ${motionMs.flick}ms ${motionEasing.current.css}`,
  });

  const image: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

  return (
    <SettingsPanelContent
      title={t('settings.profile_picture')}
      subtitle={t('settings.profile_picture_subtitle', 'Pick a preset or use one of your NFTs.')}
      onBack={onBack}
      footer={
        <PrimaryButton disabled={!hasChanged} onPress={handleSave} testID="avatar-save-button">
          {t('actions.save')}
        </PrimaryButton>
      }
    >
      <UnderlineTabs
        testID="avatar-tabs"
        tabs={[
          { key: 'presets', label: t('settings.avatar_presets') },
          { key: 'nfts', label: t('settings.avatar_nfts') },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as AvatarPickerTab)}
        tabTestIDPrefix="avatar-tab"
      />

      {activeTab === 'presets' ? (
        <div
          role="group"
          aria-label={t('settings.avatar_presets')}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${PRESET_MIN_SIZE}px, 1fr))`,
            gap: GRID_GAP,
          }}
        >
          {PRESET_AVATAR_URLS.map((url, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={selectedUrl === url}
              onClick={() => setSelectedUrl(url)}
              data-testid={`avatar-preset-${index}`}
              style={tile(selectedUrl === url, true)}
            >
              <img
                src={url}
                alt={`Avatar ${index}`}
                loading="lazy"
                style={{ ...image, borderRadius: '50%' }}
              />
            </button>
          ))}
        </div>
      ) : nftsLoading ? (
        <SkeletonRow count={3} lines={1} accessibilityLabel={t('general.loading')} />
      ) : nfts.length === 0 ? (
        <p
          data-testid="avatar-empty-nfts"
          style={{
            margin: 0,
            padding: `${spacing['3xl']}px 0`,
            textAlign: 'center',
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
          }}
        >
          {t('settings.avatar_empty_nfts')}
        </p>
      ) : (
        <div
          role="group"
          aria-label={t('settings.avatar_nfts')}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${NFT_MIN_SIZE}px, 1fr))`,
            gap: GRID_GAP,
          }}
        >
          {nfts.map((nft) => (
            <button
              key={nft.mint}
              type="button"
              aria-pressed={selectedUrl === nft.image}
              onClick={() => nft.image && setSelectedUrl(nft.image)}
              data-testid={`avatar-nft-${nft.mint}`}
              style={tile(selectedUrl === nft.image, false)}
            >
              <img src={nft.image} alt={nft.name} loading="lazy" style={image} />
            </button>
          ))}
        </div>
      )}
    </SettingsPanelContent>
  );
}
