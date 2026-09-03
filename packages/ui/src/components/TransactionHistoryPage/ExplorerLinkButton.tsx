/**
 * ExplorerLinkButton — the outlined control that opens a block explorer, or a
 * picker of them, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/ExplorerLinkButton.tsx`:
 * the kit's `SecondaryButton` with the "off to the web" mark and, when there
 * is a choice, a caret; the picker is a sheet of `ListRow`s (spec 028's DOM
 * alternative to mobile's modal — Escape and the backdrop dismiss it).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAvailableExplorers,
  getDefaultExplorer,
  getTransactionUrl,
  spacing,
  type ExplorerWithKey,
} from '@salmon/shared';

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
  const [menuVisible, setMenuVisible] = useState(false);

  const availableExplorers = useMemo(
    () => getAvailableExplorers(blockchain, environment),
    [blockchain, environment]
  );

  const selectedExplorerKey = explorerKey || getDefaultExplorer(blockchain);
  const selectedExplorer = useMemo(
    () => availableExplorers.find((e) => e.key === selectedExplorerKey),
    [availableExplorers, selectedExplorerKey]
  );

  const openExplorer = useCallback(
    (explorer: ExplorerWithKey) => {
      const url = getTransactionUrl(blockchain, environment, explorer.key, txHash);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onPress?.(url, explorer.name);
      }
      setMenuVisible(false);
    },
    [blockchain, environment, txHash, onPress]
  );

  const hasMenu = showMenu && availableExplorers.length > 1;

  const handlePress = useCallback(() => {
    if (hasMenu) {
      setMenuVisible(true);
    } else if (selectedExplorer) {
      openExplorer(selectedExplorer);
    }
  }, [hasMenu, selectedExplorer, openExplorer]);

  if (availableExplorers.length === 0 || !selectedExplorer) {
    return null;
  }

  const buttonText = hasMenu
    ? t('transactions.detail.viewOnExplorer')
    : t('transactions.detail.viewOn', { name: selectedExplorer.name });

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
          onClose={() => setMenuVisible(false)}
          title={<SheetTitle>{t('transactions.detail.chooseExplorer')}</SheetTitle>}
          testID="tx-detail-explorer-menu"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
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
