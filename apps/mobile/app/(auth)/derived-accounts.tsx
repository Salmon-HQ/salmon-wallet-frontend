/**
 * DerivedAccountsScreen - Search and import derived accounts across all networks
 *
 * This screen derives accounts (indexes 1-N) for every network the active account
 * has using BIP-44 gap scanning (gap limit = 20). Index 1 of each network is
 * always shown; subsequent indexes are only shown if they have balance.
 * The user can select which ones to import into their wallet.
 *
 * Design: Dark gradient background with loading skeleton during search,
 * list of accounts with checkboxes, import and skip buttons.
 *
 * Navigation:
 * - Comes from: password screen or success screen
 * - Goes to: main app (tabs)
 *
 * Params:
 * - mnemonic: The seed phrase to derive accounts from
 */

import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@salmon/assets';
import {
  colors,
  componentSizes,
  contentPadding,
  deriveBlockchainAccount,
  fontFamilyNative,
  getScanNetworks,
  getShortAddress,
  spacing,
  useAccountsContext,
  NETWORK_DISPLAY,
  scanDerivedAccounts,
  getMirrorNetworkId,
  type DerivedAccountInfo,
  type BlockchainAccount,
} from '@salmon/shared';
import {
  DerivedAccountCard,
  DerivedAccountCardSkeleton,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
} from '../../src/components';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <DerivedAccountCardSkeleton />
      <DerivedAccountCardSkeleton />
      <DerivedAccountCardSkeleton />
    </View>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function DerivedAccountsScreen() {
  const { t } = useTranslation();
  const [{ activeAccount }, actions] = useAccountsContext();

  // State
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [accounts, setAccounts] = useState<DerivedAccountInfo[]>([]);

  // Mnemonic comes from the unlocked active account in memory; never from
  // route params, which can be serialized by Expo Router into navigation
  // state or deep-link URLs.
  const mnemonic = activeAccount?.mnemonic;

  /**
   * Search for derived accounts across scan networks only.
   * Skips devnet/sepolia since they share keypairs with mainnets.
   */
  useEffect(() => {
    const searchDerivedAccounts = async () => {
      if (!mnemonic || !activeAccount) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Only scan networks that produce unique keypairs
      const scanNetworks = await getScanNetworks();
      const networkIds = Object.keys(activeAccount.networksAccounts)
        .filter((id) => scanNetworks.includes(id));

      const results = await scanDerivedAccounts(mnemonic, networkIds);

      setAccounts(results);
      setLoading(false);
    };

    searchDerivedAccounts();
  }, [mnemonic, activeAccount]);

  /**
   * Toggle account selection by composite key (networkId-index)
   */
  const handleToggleAccount = useCallback((key: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        `${acc.networkId}-${acc.index}` === key ? { ...acc, selected: !acc.selected } : acc,
      ),
    );
  }, []);

  /**
   * Handle skip - go directly to main app
   */
  const handleSkip = useCallback(() => {
    router.replace('/(app)/(tabs)');
  }, []);

  /**
   * Handle import selected accounts.
   * Also creates mirror accounts (devnet/sepolia) for mainnet selections.
   */
  const handleImport = useCallback(async () => {
    if (!activeAccount || !mnemonic) return;

    const selectedAccounts = accounts.filter((acc) => acc.selected);
    if (selectedAccounts.length === 0) {
      handleSkip();
      return;
    }

    setImporting(true);

    try {
      const newDerivedAccounts: BlockchainAccount[] = [];

      for (const acc of selectedAccounts) {
        newDerivedAccounts.push(acc.account);

        // Auto-create mirror account for devnet/sepolia
        const mirrorNetworkId = await getMirrorNetworkId(acc.networkId);
        if (mirrorNetworkId && activeAccount.networksAccounts[mirrorNetworkId]) {
          try {
            const mirrorAccount = await deriveBlockchainAccount(
              mnemonic,
              mirrorNetworkId,
              acc.index,
            );
            newDerivedAccounts.push(mirrorAccount);
          } catch {
            // Mirror derivation failed — skip silently
          }
        }
      }

      await actions.editAccount(activeAccount.id, {
        newDerivedAccounts,
      });

      router.replace('/(app)/(tabs)');
    } catch (error) {
      console.error('Failed to import derived accounts:', error);
      router.replace('/(app)/(tabs)');
    } finally {
      setImporting(false);
    }
  }, [accounts, activeAccount, actions, handleSkip, mnemonic]);

  /**
   * Get selected count
   */
  const selectedCount = accounts.filter((acc) => acc.selected).length;

  /**
   * Render content based on state
   */
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>{t('wallet.derived.searching')}</Text>
          <LoadingSkeleton />
        </View>
      );
    }

    if (accounts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('wallet.derived.empty_title')}</Text>
          <Text style={styles.emptySubtitle}>{t('wallet.derived.empty_subtitle')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.accountsContainer}>
        <Text style={styles.foundText}>
          {t('wallet.derived.found', { count: accounts.length })}
        </Text>
        <ScrollView
          style={styles.accountsList}
          contentContainerStyle={styles.accountsListContent}
          showsVerticalScrollIndicator={false}
        >
          {accounts.map((acc) => {
            const key = `${acc.networkId}-${acc.index}`;
            return (
              <DerivedAccountCard
                key={key}
                address={getShortAddress(acc.address, 6) ?? acc.address}
                networkName={acc.networkName}
                path={acc.path}
                balanceFormatted={acc.balanceFormatted}
                selected={acc.selected}
                dimmed={acc.balance === 0}
                blockchain={NETWORK_DISPLAY[acc.networkId]?.blockchain as 'solana' | 'bitcoin' | 'ethereum'}
                onToggle={() => handleToggleAccount(key)}
                testID={`derived-account-${key}`}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <ScreenHeader />

        {/* Content */}
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('wallet.derived.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{t('wallet.derived.subtitle')}</Text>

          {/* Dynamic Content */}
          {renderContent()}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {accounts.length > 0 && (
              <PrimaryButton
                onPress={handleImport}
                disabled={loading || importing}
                loading={importing}
                testID="derived-import-button"
              >
                {t('wallet.derived.import_selected', { count: selectedCount })}
              </PrimaryButton>
            )}

            <SecondaryButton
              onPress={handleSkip}
              disabled={importing}
              testID="derived-skip-button"
            >
              {accounts.length === 0 ? t('wallet.derived.continue') : t('wallet.derived.skip')}
            </SecondaryButton>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: contentPadding.screen,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logo: {
    width: componentSizes.logoSizeSmall,
    height: componentSizes.logoSizeSmall,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['3xl'],
  },
  loadingText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing['5xl'],
  },
  emptyTitle: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },

  // Accounts list
  accountsContainer: {
    flex: 1,
    width: '100%',
  },
  foundText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  accountsList: {
    flex: 1,
    width: '100%',
  },
  accountsListContent: {
    paddingBottom: spacing.lg,
  },

  // Skeleton
  skeletonContainer: {
    width: '100%',
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
});
