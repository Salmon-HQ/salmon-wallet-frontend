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

import { CloudSlashIcon, TreeStructureIcon, WalletIcon } from '../../src/icons';
import {
  componentSizes,
  deriveBlockchainAccount,
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  getScanNetworks,
  getShortAddress,
  spacing,
  useAccountsContext,
  getAccountMnemonic,
  NETWORK_DISPLAY,
  scanDerivedAccounts,
  getMirrorNetworkId,
  type DerivedAccountInfo,
  type BlockchainAccount,
  type Semantic,
} from '@salmon/shared';
import {
  DerivedAccountCard,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ReservedSlot,
  ScreenHeader,
  SecondaryButton,
  SkeletonRow,
  WarningNotice,
} from '../../src/components';
import { useSemantic, useThemedStyles, useThemeMode } from '../../src/theme/useThemedStyles';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  const styles = useThemedStyles(stylesFor);
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonRow
        leadingSize={componentSizes.checkboxSize}
        trailingWidth={70}
        padding="lg"
        count={3}
      />
    </View>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function DerivedAccountsScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const mode = useThemeMode();
  const [{ activeAccount }, actions] = useAccountsContext();

  // State
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [accounts, setAccounts] = useState<DerivedAccountInfo[]>([]);
  // Networks whose scan threw — distinguishes an outage from "no accounts".
  const [failedNetworks, setFailedNetworks] = useState<string[]>([]);
  const [scanToken, setScanToken] = useState(0);

  // Mnemonic comes from the unlocked active account in memory; never from
  // route params, which can be serialized by Expo Router into navigation
  // state or deep-link URLs.
  // Only a mnemonic account has a derivation tree to scan.
  const mnemonic = getAccountMnemonic(activeAccount);

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
      const networkIds = Object.keys(activeAccount.networksAccounts).filter((id) =>
        scanNetworks.includes(id)
      );

      const { accounts: results, failedNetworks } = await scanDerivedAccounts(mnemonic, networkIds);

      setAccounts(results);
      setFailedNetworks(failedNetworks);
      setLoading(false);
    };

    searchDerivedAccounts();
  }, [mnemonic, activeAccount, scanToken]);

  /**
   * Re-run the scan after a total failure
   */
  const handleRetryScan = useCallback(() => {
    setFailedNetworks([]);
    setScanToken((token) => token + 1);
  }, []);

  /**
   * Toggle account selection by composite key (networkId-index)
   */
  const handleToggleAccount = useCallback((key: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        `${acc.networkId}-${acc.index}` === key ? { ...acc, selected: !acc.selected } : acc
      )
    );
  }, []);

  /**
   * Handle skip — every exit funnels through the analytics-consent step,
   * so the derived-accounts detour cannot dodge the first-run ask.
   */
  const handleSkip = useCallback(() => {
    router.replace('/(auth)/analytics-consent');
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
              acc.index
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

      router.replace('/(auth)/analytics-consent');
    } catch (error) {
      console.error('Failed to import derived accounts:', error);
      router.replace('/(auth)/analytics-consent');
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
          <ActivityIndicator size="large" color={semantic.accent.ink} />
          <Text style={styles.loadingText}>{t('wallet.derived.searching')}</Text>
          <LoadingSkeleton />
        </View>
      );
    }

    if (accounts.length === 0) {
      // A scan that could not look must not present as an empty wallet.
      if (failedNetworks.length > 0) {
        return (
          <View style={styles.emptyContainer} testID="derived-scan-error">
            <CloudSlashIcon size={componentSizes.iconSize3XL} color={semantic.text.secondary} />
            <Text style={styles.emptyTitle}>{t('wallet.derived.scan_failed_title')}</Text>
            <Text style={styles.emptySubtitle}>{t('wallet.derived.scan_failed_body')}</Text>
            <View style={styles.retryButtonContainer}>
              <SecondaryButton onPress={handleRetryScan} testID="derived-scan-retry-button">
                {t('transactions.tapToRetry')}
              </SecondaryButton>
            </View>
          </View>
        );
      }
      return (
        <View style={styles.emptyContainer}>
          <WalletIcon size={componentSizes.iconSize3XL} color={semantic.text.secondary} />
          <Text style={styles.emptyTitle}>{t('wallet.derived.empty_title')}</Text>
          <Text style={styles.emptySubtitle}>{t('wallet.derived.empty_subtitle')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.accountsContainer}>
        {failedNetworks.length > 0 && (
          <WarningNotice
            tone="warning"
            title={t('wallet.derived.scan_partial')}
            style={styles.partialWarning}
          />
        )}
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
                blockchain={
                  NETWORK_DISPLAY[acc.networkId]?.blockchain as 'solana' | 'bitcoin' | 'ethereum'
                }
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
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <OnboardingLayout
        testID="derived-accounts-screen"
        variant="content"
        float
        // The derivation tree: one key, many branches — which is what this
        // screen scans. One semantic glyph per flow step, consent's pattern.
        mark={<TreeStructureIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
        chrome={<ScreenHeader />}
        title={<OnboardingTitle>{t('wallet.derived.title')}</OnboardingTitle>}
        description={<OnboardingDescription>{t('wallet.derived.subtitle')}</OnboardingDescription>}
        body={renderContent()}
        secondary={
          <SecondaryButton onPress={handleSkip} disabled={importing} testID="derived-skip-button">
            {accounts.length === 0 ? t('wallet.derived.continue') : t('wallet.derived.skip')}
          </SecondaryButton>
        }
        action={
          // The scan is asynchronous, so this control used to appear after
          // first paint and shove everything up 68px with no user input at
          // all. It holds its reserved band from the first frame now.
          <ReservedSlot visible={accounts.length > 0}>
            <PrimaryButton
              onPress={handleImport}
              disabled={loading || importing}
              loading={importing}
              testID="derived-import-button"
            >
              {t('wallet.derived.import_selected', { count: selectedCount })}
            </PrimaryButton>
          </ReservedSlot>
        }
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // Loading state
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      marginTop: spacing.lg,
      marginBottom: spacing['2xl'],
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    emptySubtitle: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.snug,
      marginTop: spacing.sm,
      textAlign: 'center',
    },

    retryButtonContainer: {
      marginTop: spacing.lg,
      width: '100%',
    },
    partialWarning: {
      marginBottom: spacing.lg,
    },

    // Accounts list
    accountsContainer: {
      flex: 1,
      width: '100%',
    },
    foundText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
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
  });
