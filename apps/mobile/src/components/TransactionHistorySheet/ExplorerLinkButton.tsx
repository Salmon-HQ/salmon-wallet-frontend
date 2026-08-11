import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  ms,
  vs,
  s,
  spacing,
  fontSize,
  borderRadius,
  getTransactionUrl,
  getAvailableExplorers,
  getDefaultExplorer,
  type Blockchain,
  type NetworkEnvironment,
  fontFamilyNative,
  type ExplorerWithKey,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';

// ============================================================================
// Types
// ============================================================================

export interface ExplorerLinkButtonProps {
  /** Transaction hash/signature */
  txHash: string;
  /** Blockchain type */
  blockchain?: Blockchain;
  /** Network environment */
  environment?: NetworkEnvironment;
  /** Which explorer to use (if single button mode) */
  explorerKey?: string;
  /** Whether to show as menu with multiple options */
  showMenu?: boolean;
  /** Callback when explorer is opened */
  onPress?: (url: string, explorerName: string) => void;
  /** Custom style */
  style?: ViewStyle;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ExplorerLinkButton - Button to view transactions on blockchain explorers
 *
 * Provides either a single button that opens the default explorer,
 * or a menu with multiple explorer options.
 *
 * @example
 * ```tsx
 * // Single button mode (default explorer)
 * <ExplorerLinkButton
 *   txHash="5abc..."
 *   blockchain="SOLANA"
 *   environment="solana-mainnet"
 * />
 *
 * // Menu mode with multiple explorers
 * <ExplorerLinkButton
 *   txHash="5abc..."
 *   blockchain="SOLANA"
 *   environment="solana-mainnet"
 *   showMenu
 * />
 *
 * // Specific explorer
 * <ExplorerLinkButton
 *   txHash="5abc..."
 *   blockchain="SOLANA"
 *   environment="solana-mainnet"
 *   explorerKey="SOLANA_FM"
 * />
 * ```
 */
export function ExplorerLinkButton({
  txHash,
  blockchain = 'SOLANA',
  environment = 'solana-mainnet',
  explorerKey,
  showMenu = false,
  onPress,
  style,
}: ExplorerLinkButtonProps) {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);

  // Get available explorers for this blockchain/network
  const availableExplorers = useMemo(
    () => getAvailableExplorers(blockchain, environment),
    [blockchain, environment]
  );

  // Determine which explorer to use for single button mode
  const selectedExplorerKey = explorerKey || getDefaultExplorer(blockchain);

  // Get the selected explorer info
  const selectedExplorer = useMemo(
    () => availableExplorers.find((e) => e.key === selectedExplorerKey),
    [availableExplorers, selectedExplorerKey]
  );

  // Open a specific explorer URL
  const openExplorer = useCallback(
    async (explorer: ExplorerWithKey) => {
      const url = getTransactionUrl(blockchain, environment, explorer.key, txHash);
      if (url) {
        try {
          await Linking.openURL(url);
          onPress?.(url, explorer.name);
        } catch (error) {
          console.warn('Failed to open explorer URL:', error);
        }
      }
      setMenuVisible(false);
    },
    [blockchain, environment, txHash, onPress]
  );

  // Handle button press
  const handlePress = useCallback(() => {
    if (showMenu && availableExplorers.length > 1) {
      setMenuVisible(true);
    } else if (selectedExplorer) {
      openExplorer(selectedExplorer);
    }
  }, [showMenu, availableExplorers, selectedExplorer, openExplorer]);

  // Close menu
  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // Don't render if no explorers available
  if (availableExplorers.length === 0 || !selectedExplorer) {
    return null;
  }

  // Button text
  const buttonText =
    showMenu && availableExplorers.length > 1
      ? t('transactions.detail.viewOnExplorer')
      : t('transactions.detail.viewOn', { name: selectedExplorer.name });

  return (
    <>
      <BlurContainer
        borderColor={colors.palette.amber}
        style={[styles.blurWrapper, style]}
      >
        <TouchableOpacity
          testID="tx-detail-explorer-link"
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel={buttonText}
          accessibilityHint={t('transactions.detail.explorerHint')}
        >
          <Ionicons
            name="open-outline"
            size={16}
            color={colors.palette.amber}
            style={styles.icon}
          />
          <Text style={styles.buttonText}>{buttonText}</Text>
          {showMenu && availableExplorers.length > 1 && (
            <Ionicons
              name="chevron-down"
              size={14}
              color={colors.palette.amber}
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>
      </BlurContainer>

      {/* Explorer menu modal */}
      {showMenu && availableExplorers.length > 1 && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseMenu}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCloseMenu}>
            <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
              <BlurContainer style={styles.menu}>
                <Text style={styles.menuTitle}>{t('transactions.detail.chooseExplorer')}</Text>
                {availableExplorers.map((explorer) => (
                  <TouchableOpacity
                    key={explorer.key}
                    style={styles.menuItem}
                    onPress={() => openExplorer(explorer)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={colors.text.primary}
                      style={styles.menuItemIcon}
                    />
                    <Text style={styles.menuItemText}>{explorer.name}</Text>
                    <Ionicons
                      name="open-outline"
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                ))}
              </BlurContainer>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  blurWrapper: {
    borderRadius: borderRadius.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing.lg),
  },
  icon: {
    marginRight: s(spacing.sm),
  },
  buttonText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.palette.amber,
  },
  chevron: {
    marginLeft: s(spacing.xs),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.dialog.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 320,
  },
  menu: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  menuTitle: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.lg),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(spacing.lg),
    paddingHorizontal: s(spacing.md),
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    marginBottom: vs(spacing.sm),
  },
  menuItemIcon: {
    marginRight: s(spacing.md),
  },
  menuItemText: {
    flex: 1,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
});

export default ExplorerLinkButton;
