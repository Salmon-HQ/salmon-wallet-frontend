/**
 * ExplorerLinkButton — the outlined control that opens a block explorer, or a
 * picker of them.
 *
 * The DOM twin is
 * `packages/ui/src/components/TransactionHistoryPage/ExplorerLinkButton.tsx`:
 * the kit's `SecondaryButton` with the "off to the web" mark and, when there
 * is a choice, a caret; the picker is the shared `BottomSheetContainer` with
 * a list of `ListRow`s, same as every other sheet in the app. The whole of
 * the behavior — the explorer lookup, the picker's own state, the press
 * routing, the row data — is the shared `useExplorerLink` hook; only opening
 * the resolved URL (and the icon slots on each row) is platform territory.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { ArrowSquareOutIcon, CaretDownIcon, GlobeIcon, iconSize } from '../../icons';
import {
  spacing,
  s,
  vs,
  useExplorerLink,
  type Blockchain,
  type NetworkEnvironment,
  type Semantic,
} from '@salmon/shared';
import { SecondaryButton } from '../Button';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';

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

/** The explorer row's leading well — the settings-row step. */
const EXPLORER_BUBBLE_SIZE = 36;

// ============================================================================
// Component
// ============================================================================

/**
 * ExplorerLinkButton - Button to view transactions on blockchain explorers
 *
 * Provides either a single button that opens the default explorer,
 * or a menu with multiple explorer options.
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
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const { standardContentBottomPadding } = useBottomSheetChrome();
  const {
    buttonText,
    hasMenu,
    onPress: handlePress,
    menuVisible,
    closeMenu,
    rows,
  } = useExplorerLink({
    txHash,
    blockchain,
    environment,
    explorerKey,
    showMenu,
    t,
    openUrl: Linking.openURL,
    onPress,
  });

  // Don't render if no explorers available
  if (!buttonText) {
    return null;
  }

  return (
    <>
      {/* The kit's outlined control. The leading mark says "off to the web",
          the caret says "and you get to pick where" — the picker's own
          affordance, kept from the hand-drawn button this replaced. */}
      <SecondaryButton
        icon={<ArrowSquareOutIcon size={iconSize.sm} color={text.primary} />}
        testID="tx-detail-explorer-link"
        trailingIcon={hasMenu && <CaretDownIcon size={iconSize.sm} color={text.primary} />}
        onPress={handlePress}
        style={style}
      >
        {buttonText}
      </SecondaryButton>
      <BottomSheetContainer
        testID="tx-detail-explorer-menu"
        title={<SheetTitle>{t('transactions.detail.chooseExplorer')}</SheetTitle>}
        visible={menuVisible}
        onClose={closeMenu}
      >
        <View style={[styles.content, { paddingBottom: standardContentBottomPadding }]}>
          {rows.map(({ key, ...row }) => (
            <ListRow
              {...row}
              key={key}
              trailing={<ArrowSquareOutIcon size={iconSize.sm} color={text.tertiary} />}
              leading={<IconBubble size={EXPLORER_BUBBLE_SIZE} tone="surface" icon={GlobeIcon} />}
            />
          ))}
        </View>
      </BottomSheetContainer>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.md),
    },
  });

export default ExplorerLinkButton;
