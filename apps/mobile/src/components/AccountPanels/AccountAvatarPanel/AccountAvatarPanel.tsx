/**
 * AccountAvatarPanel - Avatar selection component for mobile
 *
 * Displays two tabs:
 * - Presets: Grid of 25 preset Salmon avatars
 * - NFTs: Grid of user's NFT collectibles
 *
 * Used in the settings flow to change the account profile picture.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  contentPadding,
  borderRadius,
  borderWidth,
  fontSize,
  fontFamilyNative,
  PRESET_AVATAR_URLS,
  useAvatarNfts,
  type NftAvatarItem,
  type AvatarPickerPropsBase,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';

// ============================================================================
// Constants
// ============================================================================

const PRESET_MIN_COLUMNS = 4;
const PRESET_MAX_COLUMNS = 5;
const PRESET_MIN_SIZE = 56;
const NFT_MIN_COLUMNS = 2;
const NFT_MAX_COLUMNS = 3;
const NFT_MIN_SIZE = 96;
const GRID_GAP = spacing.sm;

type Tab = 'presets' | 'nfts';

// ============================================================================
// Types
// ============================================================================

export type AccountAvatarPanelProps = AvatarPickerPropsBase;

function getResponsiveColumns(
  availableWidth: number,
  minItemSize: number,
  minColumns: number,
  maxColumns: number
): number {
  const columns = Math.floor((availableWidth + GRID_GAP) / (minItemSize + GRID_GAP));
  return Math.max(minColumns, Math.min(maxColumns, columns));
}

// ============================================================================
// Component
// ============================================================================

export function AccountAvatarPanel({
  currentAvatarUrl,
  account,
  onSave,
  onBack,
}: AccountAvatarPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(currentAvatarUrl);

  const { nfts, loading: nftsLoading } = useAvatarNfts({
    account,
    enabled: activeTab === 'nfts',
  });

  const hasChanged = selectedUrl !== currentAvatarUrl;
  const availableWidth = useMemo(() => windowWidth - contentPadding.screen * 2, [windowWidth]);
  const presetColumns = useMemo(
    () =>
      getResponsiveColumns(availableWidth, PRESET_MIN_SIZE, PRESET_MIN_COLUMNS, PRESET_MAX_COLUMNS),
    [availableWidth]
  );
  const nftColumns = useMemo(
    () => getResponsiveColumns(availableWidth, NFT_MIN_SIZE, NFT_MIN_COLUMNS, NFT_MAX_COLUMNS),
    [availableWidth]
  );
  const presetItemSize = useMemo(
    () => (availableWidth - GRID_GAP * (presetColumns - 1)) / presetColumns,
    [availableWidth, presetColumns]
  );
  const nftItemSize = useMemo(
    () => (availableWidth - GRID_GAP * (nftColumns - 1)) / nftColumns,
    [availableWidth, nftColumns]
  );

  const handleSave = useCallback(() => {
    if (selectedUrl && hasChanged) {
      onSave(selectedUrl);
    }
  }, [selectedUrl, hasChanged, onSave]);

  // Preset avatar item renderer
  const renderPresetItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const isSelected = selectedUrl === item;
      return (
        <TouchableOpacity
          testID={`avatar-preset-${index}`}
          accessibilityRole="button"
          style={[
            styles.presetItem,
            {
              width: presetItemSize,
              height: presetItemSize,
              borderRadius: presetItemSize / 2,
            },
            isSelected && styles.presetItemSelected,
          ]}
          onPress={() => setSelectedUrl(item)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item }}
            style={[styles.presetImage, { borderRadius: presetItemSize / 2 }]}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      );
    },
    [presetItemSize, selectedUrl]
  );

  // NFT item renderer
  const renderNftItem = useCallback(
    ({ item }: { item: NftAvatarItem }) => {
      const isSelected = selectedUrl === item.image;
      return (
        <TouchableOpacity
          testID={`avatar-nft-${item.mint}`}
          accessibilityRole="button"
          style={[
            styles.nftItem,
            {
              width: nftItemSize,
              height: nftItemSize,
            },
            isSelected && styles.nftItemSelected,
          ]}
          onPress={() => item.image && setSelectedUrl(item.image)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.image }}
            style={styles.nftImage}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      );
    },
    [nftItemSize, selectedUrl]
  );

  const presetKeyExtractor = useCallback((_item: string, index: number) => `preset-${index}`, []);
  const nftKeyExtractor = useCallback((item: NftAvatarItem) => item.mint, []);

  return (
    <SettingsScreenLayout title={t('settings.profile_picture')} onBack={onBack} scrollable={false}>
      <View style={styles.container}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            testID="avatar-tab-presets"
            style={[styles.tab, activeTab === 'presets' && styles.tabActive]}
            onPress={() => setActiveTab('presets')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'presets' && styles.tabTextActive]}>
              {t('settings.avatar_presets')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="avatar-tab-nfts"
            style={[styles.tab, activeTab === 'nfts' && styles.tabActive]}
            onPress={() => setActiveTab('nfts')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'nfts' && styles.tabTextActive]}>
              {t('settings.avatar_nfts')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'presets' ? (
          <FlatList
            key={`presets-${presetColumns}`}
            style={styles.list}
            data={PRESET_AVATAR_URLS}
            renderItem={renderPresetItem}
            keyExtractor={presetKeyExtractor}
            numColumns={presetColumns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        ) : nftsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : nfts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('settings.avatar_empty_nfts')}</Text>
          </View>
        ) : (
          <FlatList
            key={`nfts-${nftColumns}`}
            style={styles.list}
            data={nfts}
            renderItem={renderNftItem}
            keyExtractor={nftKeyExtractor}
            numColumns={nftColumns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Save Button */}
        <TouchableOpacity
          testID="avatar-save-button"
          accessibilityRole="button"
          style={[styles.saveButton, !hasChanged && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanged}
          activeOpacity={0.7}
        >
          <Text style={[styles.saveButtonText, !hasChanged && styles.saveButtonTextDisabled]}>
            {t('actions.save')}
          </Text>
        </TouchableOpacity>
      </View>
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    flex: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
  },
  // The panel's one accent is spent on Save. An active tab is chrome, and a
  // salmon tab beside a salmon Save put two of them on one panel.
  tabActive: {
    backgroundColor: semantic.surface.crest,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.raised,
  },
  tabText: {
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: semantic.text.primary,
  },
  gridContent: {
    paddingBottom: spacing.lg,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  presetItem: {
    overflow: 'hidden',
    borderWidth: borderWidth.medium,
    borderColor: 'transparent',
  },
  presetItemSelected: {
    borderColor: semantic.state.selectedEdge,
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  nftItem: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: borderWidth.medium,
    borderColor: 'transparent',
  },
  nftItemSelected: {
    borderColor: semantic.state.selectedEdge,
  },
  nftImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  // The salmon never dims: a disabled save drops the fill to `surface.crest`
  // rather than fading the accent to a washed-out orange.
  saveButtonDisabled: {
    backgroundColor: semantic.surface.crest,
  },
  saveButtonText: {
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.md,
    color: semantic.accent.onFill,
  },
  saveButtonTextDisabled: {
    color: semantic.text.disabled,
  },
});

export default AccountAvatarPanel;
