/**
 * ChainSelector — the balance block's chain switcher, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/BalanceHeader/ChainSelector.tsx`: same
 * anatomy — a plain trigger reading the active chain and its environment
 * ("Solana Devnet" — `NETWORK_DISPLAY`'s name already carries the
 * environment, so this never appends a second tag) with a chevron and an
 * accent underline in the chain's own hue under the name only, not the
 * chevron. Opening it drops a dropdown
 * anchored right under the trigger — not a sheet — dismissed by a click
 * outside, Escape, or a selection. The keyboard/wheel paging on the amount
 * (`BalanceHeader`'s own `handleKeyDown`/`handleWheel`) keeps working
 * exactly as it did; this is an alternate route to the same `onSelect`.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type BlockchainBalance,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  getChainSelectorOptions,
  getChainSelectorTrigger,
  motionEasing,
  motionMs,
  shadowsCSS,
  singleScale,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretDownIcon, CheckIcon } from '../../icons';
import { Card } from '../Card';
import { ListRow } from '../ListRow';

const CHEVRON_SIZE = componentSizes.iconSizeXs;
const UNDERLINE_HEIGHT = 2;
const DROPDOWN_WIDTH = 220;
/** The row marker: one scale from the seigaiha motif, wide-stroked rather
 * than filled, at the trigger's own aspect ratio. */
const SCALE_WIDTH = componentSizes.iconSizeXSmall;
const SCALE_HEIGHT = Math.round(SCALE_WIDTH * (singleScale.height / singleScale.width));
const SCALE_STROKE_WIDTH = 5;

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
  // Two-phase so the dropdown mounts closed, then transitions to open on the
  // next frame — a CSS transition never has a "before" state to animate from
  // if both states land in the same paint.
  const [entered, setEntered] = useState(false);

  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(raf);
      setEntered(false);
    };
  }, [open]);

  const info = getChainSelectorTrigger(blockchains, activeIndex);
  if (!info) return null;
  const ink = chain.hintInk[info.blockchain];
  const trigger = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xxs }}>
      {/* The underline lives in this column, not the row: `width: 100%`
          then matches only the name's width, never the chevron beside it. */}
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: spacing.xxs }}>
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            fontSize: fontSize.body,
            color: text.secondary,
            whiteSpace: 'nowrap',
          }}
        >
          {info.label}
        </span>
        <div
          style={{
            width: '100%',
            height: UNDERLINE_HEIGHT,
            borderRadius: UNDERLINE_HEIGHT / 2,
            backgroundColor: ink,
          }}
        />
      </div>
      {info.canSwitch && <CaretDownIcon size={CHEVRON_SIZE} color={ink} weight="bold" />}
    </div>
  );

  if (!info.canSwitch) return trigger;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-testid={testID}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('home.switch_network', 'Switch network')}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          // A `<button>` centers its content and stretches to the column
          // parent's width by default — both would pull the trigger off the
          // left edge the amount below it sits on.
          textAlign: 'left',
          alignSelf: 'flex-start',
        }}
      >
        {trigger}
      </button>
      {open && (
        <>
          {/* Catches a click outside the dropdown; sits under it (z-index)
              so the dropdown's own clicks still reach its rows. */}
          <div
            data-testid={`${testID}-backdrop`}
            onClick={close}
            style={{ position: 'fixed', inset: 0, zIndex: 20 }}
          />
          <Card
            testID={`${testID}-dropdown`}
            tone="surface"
            padding="sm"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: DROPDOWN_WIDTH,
              zIndex: 21,
              boxShadow: shadowsCSS.md,
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(-4px)',
              transition: `opacity ${motionMs.swell}ms ${motionEasing.current.css}, transform ${motionMs.swell}ms ${motionEasing.current.css}`,
            }}
          >
            {/* The gap belongs here, between the rows — it did nothing on
                the Card above, whose only direct child is this listbox. */}
            <div
              role="listbox"
              aria-label={t('home.switch_network', 'Switch network')}
              style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
            >
              {getChainSelectorOptions(blockchains).map((option) => {
                const isActive = option.index === activeIndex;
                return (
                  <ListRow
                    key={option.id}
                    testID={`${testID}-option-${option.index}`}
                    title={option.name}
                    accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                      name: option.name,
                    })}
                    leading={
                      <svg
                        width={SCALE_WIDTH}
                        height={SCALE_HEIGHT}
                        viewBox={`0 0 ${singleScale.width} ${singleScale.height}`}
                      >
                        <path
                          d={singleScale.path}
                          stroke={chain.hintInk[option.blockchain]}
                          strokeWidth={SCALE_STROKE_WIDTH}
                          fill="none"
                        />
                      </svg>
                    }
                    trailing={
                      isActive ? (
                        <CheckIcon size={componentSizes.iconSizeXs} color={accent.fill} />
                      ) : undefined
                    }
                    onPress={() => {
                      close();
                      if (!isActive) onSelect(option.index);
                    }}
                  />
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default ChainSelector;
