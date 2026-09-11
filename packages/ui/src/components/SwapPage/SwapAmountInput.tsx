/**
 * SwapAmountInput — "You Send" / "You Receive", on the DOM: drawn with the
 * same `AmountEntryCard` Send's amount step uses (CORE 05): the card holds
 * the number alone, centred. The token chip and that block's own
 * "Available" line sit in a header row above the card — left and right —
 * not inside it, since Swap lets the user change either side. Mobile twin:
 * `apps/mobile/src/components/SwapScreen/SwapAmountInput.tsx`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatTokenBalance,
  spacing,
  useCurrencyContext,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { AmountEntryCard } from '../AmountEntryCard';
import type { SwapAmountInputProps } from './types';

function TokenMark({ uri, symbol }: { uri?: string; symbol?: string }) {
  const t = useSemantic();
  const [failed, setFailed] = useState(false);
  const size = componentSizes.iconSizeMedium;
  const shell: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: t.surface.raised,
    flexShrink: 0,
  };
  if (!uri || failed) {
    return (
      <span
        style={{
          ...shell,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontSize.xs,
          color: t.text.secondary,
        }}
      >
        {symbol?.[0] ?? '?'}
      </span>
    );
  }
  return <img src={uri} alt="" style={shell} onError={() => setFailed(true)} />;
}

export function SwapAmountInput({
  label,
  value,
  onChangeValue,
  token,
  onTokenPress,
  usdValue,
  editable = true,
  style,
  isLoading = false,
  highlighted = false,
  testID,
}: SwapAmountInputProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();

  const subtext =
    usdValue !== undefined
      ? `${formatPrecise(Math.floor(usdValue * 100) / 100)} ${currency.toUpperCase()}`
      : undefined;

  const availableText = token
    ? `${t('send.screens.available')} ${formatTokenBalance(token.balance ?? 0)} ${token.symbol}`
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}>
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          color: semantic.text.primary,
        }}
      >
        {label}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <button
          type="button"
          data-testid={testID ? `${testID}-token` : undefined}
          onClick={onTokenPress}
          aria-label={token?.symbol ?? t('actions.select', 'Select')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xxs}px ${spacing.sm}px`,
            minWidth: componentSizes.swapSelectorMinWidth,
            border: 'none',
            borderRadius: borderRadius.sm,
            background: semantic.surface.raised,
            color: semantic.text.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.base,
            fontWeight: fontWeight.bold,
            cursor: 'pointer',
          }}
        >
          <TokenMark uri={token?.logo} symbol={token?.symbol} />
          <span>{token?.symbol ?? t('actions.select', 'Select')}</span>
        </button>

        {availableText !== undefined && (
          <span
            data-testid={testID ? `${testID}-available` : undefined}
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.sm,
              color: semantic.text.secondary,
              textAlign: 'right',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {availableText}
          </span>
        )}
      </div>

      <AmountEntryCard
        testID={testID}
        value={value}
        onChangeValue={onChangeValue}
        editable={editable}
        placeholder="0"
        loading={isLoading}
        focused={highlighted}
        subtext={subtext}
      />
    </div>
  );
}
