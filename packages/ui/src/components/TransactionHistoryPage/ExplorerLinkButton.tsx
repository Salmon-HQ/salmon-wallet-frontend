/**
 * ExplorerLinkButton — the outlined control that opens a block explorer, or a
 * picker of them, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/ExplorerLinkButton.tsx`:
 * the kit's `SecondaryButton` with the "off to the web" mark and, when there
 * is a choice, a caret; the picker is a sheet of `ListRow`s (spec 028's DOM
 * alternative to mobile's modal — Escape and the backdrop dismiss it). The
 * whole of the behavior — the explorer lookup, the picker's own state, the
 * press routing, the row data — is the shared `useExplorerLink` hook; only
 * opening the resolved URL (and the icon slots on each row) is platform
 * territory.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useExplorerLink } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowSquareOutIcon, CaretDownIcon, GlobeIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import type { ExplorerLinkButtonProps } from './types';

/** The explorer row's leading well. */
const EXPLORER_BUBBLE_SIZE = 36;

const openUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export function ExplorerLinkButton({
  txHash,
  blockchain = 'SOLANA',
  environment = 'solana-mainnet',
  explorerKey,
  showMenu = false,
  onPress,
  className,
  style,
}: ExplorerLinkButtonProps) {
  const { t } = useTranslation();
  const { text } = useSemantic();
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
    openUrl,
    onPress,
  });

  if (!buttonText) {
    return null;
  }

  return (
    <>
      <SecondaryButton
        testID="tx-detail-explorer-link"
        onPress={handlePress}
        className={className}
        style={style}
        icon={<ArrowSquareOutIcon size={iconSize.sm} color={text.primary} />}
        trailingIcon={hasMenu && <CaretDownIcon size={iconSize.sm} color={text.primary} />}
      >
        {buttonText}
      </SecondaryButton>
      <BottomSheetContainer
        visible={menuVisible}
        onClose={closeMenu}
        title={<SheetTitle>{t('transactions.detail.chooseExplorer')}</SheetTitle>}
        testID="tx-detail-explorer-menu"
      >
        <div
          style={{
            paddingTop: spacing.md,
            paddingBottom: spacing['2xl'],
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
          }}
        >
          {rows.map(({ key, ...row }) => (
            <ListRow
              key={key}
              {...row}
              leading={<IconBubble size={EXPLORER_BUBBLE_SIZE} tone="surface" icon={GlobeIcon} />}
              trailing={<ArrowSquareOutIcon size={iconSize.sm} color={text.tertiary} />}
            />
          ))}
        </div>
      </BottomSheetContainer>
    </>
  );
}
