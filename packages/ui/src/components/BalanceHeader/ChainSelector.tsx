/**
 * ChainSelector — the balance block's chain switcher, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/BalanceHeader/ChainSelector.tsx`: same
 * anatomy — a plain trigger reading the active chain and its environment
 * ("Solana · Devnet") with a chevron and an accent underline in the chain's
 * own hue, no box, no chip — opening a sheet listing every chain the balance
 * block already pages through. The keyboard/wheel paging on the amount
 * (`BalanceHeader`'s own `handleKeyDown`/`handleWheel`) keeps working
 * exactly as it did; this is an alternate route to the same `onSelect`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type BlockchainBalance,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  getChainSelectorOptions,
  getChainSelectorTrigger,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretDownIcon, CheckIcon } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { ListRow } from '../ListRow';

const CHEVRON_SIZE = componentSizes.iconSizeXxs;
const UNDERLINE_HEIGHT = 2;

interface ChainSelectorProps {
  blockchains: BlockchainBalance[];
  activeIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
}

export function ChainSelector({
  blockchains,
  activeIndex,
  onSelect,
  testID = 'balance-chain-selector',
}: ChainSelectorProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { text, chain, accent } = useSemantic();
  const [open, setOpen] = useState(false);

  const info = getChainSelectorTrigger(blockchains, activeIndex);
  if (!info) return null;
  const ink = chain.hintInk[info.blockchain];
  const trigger = (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: spacing.xxs }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xxs }}>
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            fontSize: fontSize.caption,
            color: text.secondary,
            whiteSpace: 'nowrap',
          }}
        >
          {info.label}
        </span>
        {info.canSwitch && <CaretDownIcon size={CHEVRON_SIZE} color={ink} weight="bold" />}
      </div>
      <div style={{ height: UNDERLINE_HEIGHT, borderRadius: UNDERLINE_HEIGHT / 2, backgroundColor: ink }} />
    </div>
  );

  if (!info.canSwitch) return trigger;

  return (
    <>
      <button
        type="button"
        data-testid={testID}
        onClick={() => setOpen(true)}
        aria-label={t('home.switch_network', 'Switch network')}
        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        {trigger}
      </button>
      <BottomSheetContainer
        visible={open}
        onClose={() => setOpen(false)}
        title={<SheetTitle>{t('home.switch_network', 'Switch network')}</SheetTitle>}
        testID={`${testID}-sheet`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {getChainSelectorOptions(blockchains).map((option) => {
            const isActive = option.index === activeIndex;
            return (
              <ListRow
                key={option.id}
                testID={`${testID}-option-${option.index}`}
                title={option.name}
                subtitle={option.networkLabel ?? undefined}
                accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                  name: option.name,
                })}
                leading={
                  <div
                    style={{
                      width: componentSizes.iconSizeXxsm,
                      height: componentSizes.iconSizeXxsm,
                      borderRadius: componentSizes.iconSizeXxsm / 2,
                      backgroundColor: chain.hintInk[option.blockchain],
                    }}
                  />
                }
                trailing={
                  isActive ? <CheckIcon size={componentSizes.iconSizeXs} color={accent.fill} /> : undefined
                }
                onPress={() => {
                  setOpen(false);
                  if (!isActive) onSelect(option.index);
                }}
              />
            );
          })}
        </div>
      </BottomSheetContainer>
    </>
  );
}

export default ChainSelector;
