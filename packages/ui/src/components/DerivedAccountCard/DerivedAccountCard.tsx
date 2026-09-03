/**
 * DerivedAccountCard — a selectable account found by a derivation scan, on
 * the DOM. The mobile twin is `apps/mobile/src/components/DerivedAccountCard`.
 */
import React from 'react';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  opacity,
  spacing,
  tabularNums,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, iconSize } from '../../icons';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon';
import type { DerivedAccountCardProps } from './types';

const ICON_SIZE = componentSizes.iconSizeXs;

function BlockchainIcon({ blockchain, color }: { blockchain?: string; color: string }) {
  const style = { width: ICON_SIZE, height: ICON_SIZE, color };
  switch (blockchain) {
    case 'solana':
      return <SolanaSvgIcon style={style} />;
    case 'bitcoin':
      return <BitcoinSvgIcon style={style} />;
    case 'ethereum':
      return <EthereumSvgIcon style={style} />;
    default:
      return null;
  }
}

function DerivedAccountCardComponent({
  address,
  networkName,
  path,
  balanceFormatted,
  selected,
  dimmed,
  onToggle,
  blockchain,
  style,
  className,
  testID,
}: DerivedAccountCardProps) {
  const t = useSemantic();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={className}
      data-testid={testID}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        margin: 0,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        backgroundColor: t.surface.raised,
        borderRadius: borderRadius.xl,
        borderStyle: 'solid',
        borderWidth: borderWidth.thin,
        borderColor: selected ? t.state.selectedEdge : t.border.raised,
        padding: spacing.lg,
        ...style,
      }}
    >
      <span
        style={{
          width: componentSizes.checkboxSize,
          height: componentSizes.checkboxSize,
          borderRadius: borderRadius.sm,
          backgroundColor: selected ? t.accent.ink : t.overlay.highlight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.lg,
          flexShrink: 0,
        }}
      >
        {selected && <CheckIcon size={iconSize.sm} color={t.accent.onFill} />}
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            color: t.text.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {address}
        </span>
        <span
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.xxs,
          }}
        >
          <BlockchainIcon blockchain={blockchain} color={t.text.tertiary} />
          <span
            style={{
              ...tabularNums.css,
              color: t.text.tertiary,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.medium,
              fontSize: fontSize.caption,
            }}
          >
            {networkName} &middot; {path}
          </span>
        </span>
      </span>

      <span
        style={{
          ...tabularNums.css,
          color: t.text.primary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.body,
          opacity: dimmed ? opacity.faint : 1,
          flexShrink: 0,
        }}
      >
        {balanceFormatted}
      </span>
    </button>
  );
}

export const DerivedAccountCard = React.memo(DerivedAccountCardComponent);
