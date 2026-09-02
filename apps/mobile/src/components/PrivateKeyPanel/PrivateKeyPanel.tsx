/**
 * PrivateKeyPanel - Two-step private key reveal component
 *
 * Step 1: Network selection (skipped if only one network)
 * Step 2: Private key display with tap-to-reveal and optional biometric gate
 *
 * Both steps are kit compositions now — `ListRow` for the network gate,
 * `Card` for each key block — but the gate itself is untouched: a reveal
 * always costs a fresh proof of identity, and the key is exhibited on
 * bedrock (DESIGN.md, The Seed Phrase Rule's ground).
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { EyeIcon, GlobeIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';

import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  getAccountKeysForNetwork,
  getShortAddress,
  lineHeight,
  s,
  spacing,
  useAccountsContext,
  type Account,
  type AccountKeyInfo,
  type PrivateKeyPanelPropsBase,
  type Semantic,
} from '@salmon/shared';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { ConfirmSheet } from '../ConfirmSheet';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { WarningNotice } from '../WarningNotice';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';

// ============================================================================
// Chain identity
// ============================================================================

// The chain marks the rest of the app already uses for identity (BalanceCard,
// DerivedAccountCard, the swap's token selector) — the icon migration's
// declared exception. Four identical globes told the reader nothing about
// which chain's key they were about to expose.
const CHAIN_MARKS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  solana: SolanaSvgIcon,
  bitcoin: BitcoinSvgIcon,
  ethereum: EthereumSvgIcon,
};

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

// ============================================================================
// Types
// ============================================================================

interface Network {
  id: string;
  name: string;
  blockchain: string;
}

// A fixed-width mask: the key's own length says which encoding it is, and
// nothing should be readable about a key before its gate.
const KEY_MASK = '••••••••••••••••••••••••';

export interface PrivateKeyPanelProps extends PrivateKeyPanelPropsBase {
  networks: Network[];
  activeAccount: Account;
  biometricAvailable: boolean;
  authenticateWithBiometric: () => Promise<string | null>;
}

// ============================================================================
// Component
// ============================================================================

export function PrivateKeyPanel({
  networks,
  activeAccount,
  onBack,
  biometricAvailable,
  authenticateWithBiometric,
}: PrivateKeyPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();

  // A private key is a full spending credential; protect the panel from the
  // network picker onward so backgrounding mid-flow is never a gap.
  useSecretScreen('private-key-panel');

  const [, accountActions] = useAccountsContext();

  // Step management: 'selectNetwork' or 'displayKeys'
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(
    networks.length === 1 ? networks[0].id : null
  );

  // Track which account indexes have been revealed (by index)
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const { copiedKey: copiedIndex, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null);
  // Which key the password sheet is currently standing in front of.
  const [reauthIndex, setReauthIndex] = useState<number | null>(null);

  // Get accounts for the selected network
  const accountKeys: AccountKeyInfo[] = useMemo(
    () => getAccountKeysForNetwork(activeAccount, selectedNetworkId),
    [selectedNetworkId, activeAccount]
  );

  /**
   * Handle network selection
   */
  const handleSelectNetwork = useCallback(
    (networkId: string) => {
      setSelectedNetworkId(networkId);
      setRevealedIndexes(new Set());
      resetCopied();
      setCopyFailedIndex(null);
      setReauthIndex(null);
    },
    [resetCopied]
  );

  const revealKey = useCallback((index: number) => {
    setRevealedIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  /**
   * Handle tap-to-reveal. An unlocked session is not proof of identity — it
   * only proves the phone was left open. Biometrics count as the same proof as
   * the password, so a device with Face ID keeps its one-prompt flow; a device
   * without one now falls back to typing the password rather than to nothing
   * at all. A private key is worse than the phrase: one tap copies full
   * spending control of the account.
   */
  const handleReveal = useCallback(
    async (index: number) => {
      if (biometricAvailable) {
        const result = await authenticateWithBiometric();
        if (result === null) return; // Auth failed, don't reveal
        revealKey(index);
        return;
      }

      setReauthIndex(index);
    },
    [biometricAvailable, authenticateWithBiometric, revealKey]
  );

  const handleReauthenticated = useCallback(async () => {
    if (reauthIndex !== null) revealKey(reauthIndex);
  }, [reauthIndex, revealKey]);

  /**
   * Copy private key to clipboard
   */
  const handleCopy = useCallback(
    async (privateKey: string, index: number) => {
      if (!revealedIndexes.has(index)) return;

      try {
        await Clipboard.setStringAsync(privateKey);
        setCopyFailedIndex(null);
        showCopied(index);
      } catch (error) {
        // Surface the failure — a silent no-op looks like a successful copy.
        console.error('Failed to copy private key:', error);
        setCopyFailedIndex(index);
      }
    },
    [revealedIndexes, showCopied]
  );

  /**
   * Handle back from key display to network selection
   */
  const handleBackToNetworks = useCallback(() => {
    setSelectedNetworkId(null);
    setRevealedIndexes(new Set());
    resetCopied();
    setCopyFailedIndex(null);
    setReauthIndex(null);
  }, [resetCopied]);
  const currentBackAction =
    selectedNetworkId && networks.length > 1 ? handleBackToNetworks : onBack;

  // ========================================================================
  // Step 1: Network Selection
  // ========================================================================

  if (!selectedNetworkId) {
    return (
      <SettingsScreenLayout
        title={t('settings.select_network')}
        subtitle={t('settings.select_network_description')}
        onBack={onBack}
      >
        {networks.map((network) => {
          // Ids arrive canonical ('solana-mainnet', 'bitcoin-testnet'), so
          // the environment is the second segment; an id without one counts
          // as mainnet, the same reading the token selector does.
          const [chain, env] = network.id.toLowerCase().split('-');
          const Mark = CHAIN_MARKS[chain] ?? GlobeIcon;
          const isNonMainnet = Boolean(env) && env !== 'mainnet';

          return (
            <ListRow
              key={network.id}
              testID={`private-key-network-option-${network.id}`}
              leading={
                <IconBubble
                  size={ROW_BUBBLE_SIZE}
                  shape="rounded"
                  tone="surface"
                  icon={Mark}
                  iconSize={iconSize.md}
                />
              }
              title={network.name}
              subtitle={network.blockchain.charAt(0).toUpperCase() + network.blockchain.slice(1)}
              onPress={() => handleSelectNetwork(network.id)}
              // Chain identity: a non-mainnet environment always keeps its
              // loud text chip, so a testnet key can never be read as a
              // mainnet one. Mainnet stays silent — the quiet chain mark
              // on the left already carries it. The row carries no caret:
              // selecting a network does not slide a panel in.
              trailing={
                isNonMainnet ? (
                  <Chip
                    size="sm"
                    variant="outline"
                    label={env.toUpperCase()}
                    testID={`private-key-network-chip-${network.id}`}
                  />
                ) : undefined
              }
            />
          );
        })}
      </SettingsScreenLayout>
    );
  }

  // ========================================================================
  // Step 2: Private Key Display
  // ========================================================================

  return (
    <SettingsScreenLayout
      title={t('settings.private_key')}
      subtitle={t('settings.private_key_subtitle', 'View the private keys for this network.')}
      onBack={currentBackAction}
    >
      <WarningNotice tone="warning" title={t('wallet.import.warning_title')}>
        {t('settings.private_key_warning')}
      </WarningNotice>

      {accountKeys.length === 0 ? (
        <Text style={styles.emptyText}>{t('settings.no_accounts_for_network')}</Text>
      ) : (
        accountKeys.map((accountKey, index) => {
          const isRevealed = revealedIndexes.has(index);
          const isCopied = copiedIndex === index;

          return (
            <Card key={index} padding="lg" gap={spacing.md}>
              <KeyValueRow label={t('settings.derivation_path')} value={accountKey.path} />
              <KeyValueRow
                label={t('general.address')}
                value={getShortAddress(accountKey.address, 8) ?? accountKey.address}
                valueTone="secondary"
              />

              {/* Private key with reveal cover */}
              <View style={styles.keyContainer} testID={`private-key-card-${index}`}>
                <Text style={styles.keyText} selectable={isRevealed}>
                  {isRevealed ? accountKey.privateKey : KEY_MASK}
                </Text>
                {!isRevealed && (
                  <TouchableOpacity
                    style={styles.revealCover}
                    onPress={() => handleReveal(index)}
                    activeOpacity={0.8}
                    testID={`private-key-reveal-overlay-${index}`}
                    accessibilityRole="button"
                  >
                    <EyeIcon size={iconSize.xl} color={text.primary} />
                    {/* Both branches cost a proof of identity, so the label
                        does not promise a free tap. */}
                    <Text style={styles.revealText}>{t('settings.authenticate_to_reveal')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* The clipboard is not private, and the warning has to be up
                  before the key goes into it, not as a toast afterwards. */}
              {isRevealed && (
                <View testID={`private-key-clipboard-warning-${index}`}>
                  <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
                    {t('settings.clipboard_key_warning_description')}
                  </WarningNotice>
                </View>
              )}

              <SecondaryButton
                onPress={() => handleCopy(accountKey.privateKey, index)}
                disabled={!isRevealed}
                testID={`private-key-copy-button-${index}`}
              >
                {isCopied ? t('wallet.copied') : t('actions.copy')}
              </SecondaryButton>
              {copyFailedIndex === index && (
                <View testID={`private-key-copy-error-${index}`}>
                  <WarningNotice tone="error" title={t('settings.copy_failed')} />
                </View>
              )}
            </Card>
          );
        })
      )}

      <PrimaryButton onPress={onBack} testID="private-key-done-button">
        {t('actions.done')}
      </PrimaryButton>

      <ConfirmSheet
        visible={reauthIndex !== null}
        onClose={() => setReauthIndex(null)}
        title={t('settings.reveal_private_key_title')}
        message={t('settings.reveal_private_key_message')}
        confirmText={t('actions.reveal')}
        requirePassword
        validatePassword={accountActions.checkPassword}
        onConfirm={handleReauthenticated}
      />
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // The Bedrock Rule (DESIGN.md): a private key is a bedrock surface like the
    // seed — its exhibiting ground is `surface.bedrock`, α 1.00, never a
    // translucent card that lets the water show through the key.
    keyContainer: {
      position: 'relative',
      backgroundColor: t.surface.bedrock,
      borderRadius: borderRadius.r3,
      padding: s(spacing.lg),
      minHeight: 80,
      justifyContent: 'center',
    },
    // Geist Mono, as every value read character by character renders — the key
    // is the most position-critical string in the app. Mono is fixed-pitch, so
    // no added tracking.
    keyText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.monoLg),
      lineHeight: s(fontSize.monoLg) * lineHeight.normal,
    },
    // Opaque, not a scrim: a translucent cover over a masked key reads as a
    // loading state and lets the water column through the gate.
    revealCover: {
      ...StyleSheet.absoluteFillObject,
      // Declared, not implied by sibling order: a reorder must not uncover the gate.
      zIndex: 10,
      backgroundColor: t.surface.bedrock,
      borderRadius: borderRadius.r3,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
    },
    revealText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.bodyLg),
    },
    emptyText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      textAlign: 'center',
    },
  });

export default PrivateKeyPanel;
