/**
 * PrivateKeyPanel — two-step private key reveal, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PrivateKeyPanel`. Step 1
 * picks a network (skipped if there is only one); step 2 exhibits each key
 * on bedrock behind a reveal gate. Both steps are kit compositions —
 * `ListRow` for the network gate, `Card` for each key block — and the gate
 * itself is untouched: a reveal always costs a fresh proof of identity.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  getShortAddress,
  lineHeight,
  spacing,
  useAccountsContext,
  useCopyFeedback,
  type AccountKeyInfo,
  type IconGlyphProps,
} from '@salmon/shared';
import {
  buildNetworkListFromAccount,
  getAccountKeysForNetwork,
} from '@salmon/shared/utils/account';

import { useSemantic } from '../../theme/ThemeProvider';
import { EyeIcon, GlobeIcon, iconSize } from '../../icons';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { ConfirmDialog } from '../ConfirmDialog';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { PrivateKeyPanelProps } from './types';

// The chain marks the rest of the app already uses for identity — the icon
// migration's declared exception. Four identical globes told the reader
// nothing about which chain's key they were about to expose.
function asGlyph(
  Mark: React.ComponentType<{ style?: React.CSSProperties }>,
  name: string
): React.ComponentType<IconGlyphProps> {
  function ChainGlyph({ size, color }: IconGlyphProps) {
    return <Mark style={{ width: size, height: size, color }} />;
  }
  ChainGlyph.displayName = `ChainGlyph(${name})`;
  return ChainGlyph;
}

const CHAIN_MARKS: Record<string, React.ComponentType<IconGlyphProps>> = {
  solana: asGlyph(SolanaSvgIcon, 'solana'),
  bitcoin: asGlyph(BitcoinSvgIcon, 'bitcoin'),
  ethereum: asGlyph(EthereumSvgIcon, 'ethereum'),
};

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

// A fixed-width mask: the key's own length says which encoding it is, and
// nothing should be readable about a key before its gate.
const KEY_MASK = '••••••••••••••••••••••••';

export function PrivateKeyPanel({ onBack }: PrivateKeyPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { surface, text } = useSemantic();
  const [state, actions] = useAccountsContext();
  const { activeAccount } = state;

  const networks = useMemo(() => buildNetworkListFromAccount(activeAccount), [activeAccount]);

  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const { copiedKey: copiedIndex, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null);
  // Which key the password sheet is currently standing in front of.
  const [reauthIndex, setReauthIndex] = useState<number | null>(null);

  // Auto-select if only one network
  const effectiveNetworkId = networks.length === 1 ? networks[0].id : selectedNetworkId;

  const accountKeys: AccountKeyInfo[] = useMemo(
    () => getAccountKeysForNetwork(activeAccount, effectiveNetworkId),
    [effectiveNetworkId, activeAccount]
  );

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

  // An unlocked session is not proof of identity — the password is asked
  // again before a private key, full spending control of the account, comes
  // into view.
  const handleReveal = useCallback((index: number) => {
    setReauthIndex(index);
  }, []);

  const handleReauthenticated = useCallback(async () => {
    setRevealedIndexes((prev) => {
      if (reauthIndex === null) return prev;
      const next = new Set(prev);
      next.add(reauthIndex);
      return next;
    });
  }, [reauthIndex]);

  const handleCopy = useCallback(
    async (privateKey: string, index: number) => {
      if (!revealedIndexes.has(index)) return;
      try {
        await navigator.clipboard.writeText(privateKey);
        setCopyFailedIndex(null);
        showCopied(index);
      } catch {
        // Surface the failure — a silent no-op looks like a successful copy.
        setCopyFailedIndex(index);
      }
    },
    [revealedIndexes, showCopied]
  );

  const handleBackToNetworks = useCallback(() => {
    setSelectedNetworkId(null);
    setRevealedIndexes(new Set());
    resetCopied();
    setCopyFailedIndex(null);
    setReauthIndex(null);
  }, [resetCopied]);

  // ========================================================================
  // Step 1: Network Selection
  // ========================================================================

  if (!effectiveNetworkId) {
    return (
      <SettingsPanelContent
        title={t('settings.select_network')}
        subtitle={t('settings.select_network_description')}
        onBack={onBack}
      >
        {networks.map((network) => {
          // Ids arrive canonical ('solana-mainnet', 'bitcoin-testnet'), so
          // the environment is the second segment; an id without one counts
          // as mainnet.
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
              // mainnet one.
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
      </SettingsPanelContent>
    );
  }

  // ========================================================================
  // Step 2: Private Key Display
  // ========================================================================

  return (
    <SettingsPanelContent
      title={t('settings.private_key', 'Private Key')}
      subtitle={t('settings.private_key_subtitle', 'View the private keys for this network.')}
      onBack={networks.length > 1 ? handleBackToNetworks : onBack}
    >
      <WarningNotice tone="warning" title={t('wallet.import.warning_title')}>
        {t('settings.private_key_warning')}
      </WarningNotice>

      {accountKeys.length === 0 ? (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.body,
            lineHeight: `${fontSize.body * lineHeight.snug}px`,
          }}
        >
          {t('settings.no_accounts_for_network')}
        </p>
      ) : (
        accountKeys.map((accountKey, index) => {
          const isRevealed = revealedIndexes.has(index);
          const isCopied = copiedIndex === index;

          return (
            <Card key={index} padding="lg" gap={spacing.md} style={{ flexDirection: 'column' }}>
              <KeyValueRow label={t('settings.derivation_path')} value={accountKey.path} />
              <KeyValueRow
                label={t('general.address')}
                value={getShortAddress(accountKey.address, 8) ?? accountKey.address}
                valueTone="secondary"
              />

              {/* The Bedrock Rule: a private key is exhibited on
                  `surface.bedrock`, never a translucent card. */}
              <div
                data-testid={`private-key-card-${index}`}
                style={{
                  position: 'relative',
                  backgroundColor: surface.bedrock,
                  borderRadius: borderRadius.r3,
                  padding: spacing.lg,
                  minHeight: 80,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: text.primary,
                    fontFamily: fontFamily.mono,
                    fontSize: fontSize.monoLg,
                    lineHeight: `${fontSize.monoLg * lineHeight.normal}px`,
                    wordBreak: 'break-all',
                    userSelect: isRevealed ? 'text' : 'none',
                  }}
                >
                  {isRevealed ? accountKey.privateKey : KEY_MASK}
                </span>
                {!isRevealed && (
                  <button
                    type="button"
                    onClick={() => handleReveal(index)}
                    data-testid={`private-key-reveal-overlay-${index}`}
                    aria-label={t('settings.authenticate_to_reveal')}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.sm,
                      margin: 0,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: surface.bedrock,
                      borderRadius: borderRadius.r3,
                      color: text.primary,
                      fontFamily: fontFamily.sans,
                      fontWeight: fontWeight.medium,
                      fontSize: fontSize.bodyLg,
                    }}
                  >
                    <EyeIcon size={iconSize.xl} color={text.primary} />
                    <span>{t('settings.authenticate_to_reveal')}</span>
                  </button>
                )}
              </div>

              {/* The clipboard is not private, and the warning has to be up
                  before the key goes into it, not as a toast afterwards. */}
              {isRevealed && (
                <div data-testid={`private-key-clipboard-warning-${index}`}>
                  <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
                    {t('settings.clipboard_key_warning_description')}
                  </WarningNotice>
                </div>
              )}

              <SecondaryButton
                onPress={() => void handleCopy(accountKey.privateKey, index)}
                disabled={!isRevealed}
                testID={`private-key-copy-button-${index}`}
              >
                {isCopied ? t('wallet.copied') : t('actions.copy')}
              </SecondaryButton>
              {copyFailedIndex === index && (
                <div data-testid={`private-key-copy-error-${index}`}>
                  <WarningNotice tone="error" title={t('settings.copy_failed')} />
                </div>
              )}
            </Card>
          );
        })
      )}

      <PrimaryButton onPress={onBack} testID="private-key-done-button">
        {t('actions.done')}
      </PrimaryButton>

      <ConfirmDialog
        visible={reauthIndex !== null}
        onClose={() => setReauthIndex(null)}
        title={t('settings.reveal_private_key_title')}
        message={t('settings.reveal_private_key_message')}
        confirmText={t('actions.reveal', 'Reveal')}
        requirePassword
        validatePassword={actions.checkPassword}
        onConfirm={handleReauthenticated}
        confirmTestID="private-key-reauth-confirm"
      />
    </SettingsPanelContent>
  );
}
