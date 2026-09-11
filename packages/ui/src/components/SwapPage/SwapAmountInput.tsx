/**
 * SwapAmountInput — "You Send" / "You Receive", on the DOM: drawn with the
 * same `AmountEntryCard` Send's amount step uses (CORE 05): the card holds
 * the number alone, centred. The token chip and that block's own
 * "Available" line sit in a header row above the card — left and right —
 * not inside it, since Swap lets the user change either side. Mobile twin:
 * `apps/mobile/src/components/SwapScreen/SwapAmountInput.tsx`.
 */
import React from 'react';
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
import { TokenLogo } from '../TokenList';
import type { SwapAmountInputProps } from './types';

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
        {/* The token chip, the mobile twin's object on the same tokens: a
            raised plate, the mark at the icon ramp's medium step, the symbol
            in bold primary ink. */}
        <button
          type="button"
          data-testid={testID ? `${testID}-token` : undefined}
          onClick={onTokenPress}
          aria-label={token?.symbol ?? t('actions.select', 'Select')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            padding: `${spacing.xxs}px ${spacing.sm}px`,
            minHeight: componentSizes.iconSizeXL,
            minWidth: componentSizes.swapSelectorMinWidth,
            border: 'none',
            borderRadius: borderRadius.md,
            background: semantic.surface.raised,
            color: semantic.text.primary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.base,
            fontWeight: fontWeight.bold,
            cursor: 'pointer',
          }}
        >
          <TokenLogo
            uri={token?.logo || undefined}
            symbol={token?.symbol}
            size={componentSizes.iconSizeMedium}
            borderRadius={componentSizes.iconSizeMedium / 2}
          />
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
