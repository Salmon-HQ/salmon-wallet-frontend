/**
 * ExplorerLinkButton — the outlined control that opens a block explorer, or a
 * picker of them, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/ExplorerLinkButton.tsx`:
 * the kit's `SecondaryButton` with the "off to the web" mark and, when there
 * is a choice, a caret; the picker is a sheet of `ListRow`s (spec 028's DOM
 * alternative to mobile's modal — Escape and the backdrop dismiss it). The
 * explorer lookup and the picker's own state are the shared `useExplorerLink`
 * hook; only opening the resolved URL is platform territory.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useExplorerLink, type ExplorerWithKey } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowSquareOutIcon, CaretDownIcon, GlobeIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import type { ExplorerLinkButtonProps } from './types';

/** The explorer row's leading well. */
const EXPLORER_BUBBLE_SIZE = 36;

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
    menuVisible,
    closeMenu,
    availableExplorers,
    selectedExplorer,
    hasMenu,
    getExplorerUrl,
    buttonText,
    resolvePress,
  } = useExplorerLink({ txHash, blockchain, environment, explorerKey, showMenu, t });

  const openExplorer = useCallback(
    (explorer: ExplorerWithKey) => {
      const url = getExplorerUrl(explorer);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onPress?.(url, explorer.name);
      }
      closeMenu();
    },
    [getExplorerUrl, onPress, closeMenu]
  );

  const handlePress = useCallback(() => resolvePress(openExplorer), [resolvePress, openExplorer]);

  if (!buttonText || !selectedExplorer) {
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
        trailingIcon={
          hasMenu ? <CaretDownIcon size={iconSize.sm} color={text.primary} /> : undefined
        }
      >
        {buttonText}
      </SecondaryButton>

      {hasMenu && (
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
            {availableExplorers.map((explorer) => (
              <ListRow
                key={explorer.key}
                testID={`tx-detail-explorer-${explorer.key}`}
                leading={
                  <IconBubble
                    size={EXPLORER_BUBBLE_SIZE}
                    shape="circle"
                    tone="surface"
                    icon={GlobeIcon}
                    iconSize={iconSize.sm}
                  />
                }
                title={explorer.name}
                trailing={<ArrowSquareOutIcon size={iconSize.sm} color={text.tertiary} />}
                onPress={() => openExplorer(explorer)}
              />
            ))}
          </div>
        </BottomSheetContainer>
      )}
    </>
  );
}
