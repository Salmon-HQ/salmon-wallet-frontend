/**
 * SwapAmountInput — the amount field with its token selector, on the DOM:
 * "You Send" (editable, with the balance and the quick fills) and "You
 * Receive" (read-only, breathing while a quote is in flight). The mobile
 * twin is `apps/mobile/src/components/SwapScreen/SwapAmountInput.tsx`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatTokenBalance,
  sanitizeDecimalInput,
  spacing,
  tabularNums,
  useCurrencyContext,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, focusRingNone } from '../../theme';
import { CaretDownIcon } from '../../icons';
import { Card } from '../Card';
import { ChipGroup } from '../Chip';
import { PendingValue } from '../PendingValue';
import type { SwapAmountInputProps } from './types';

const QUICK_FILLS = [
  { key: '25', value: 0.25 },
  { key: '50', value: 0.5 },
  { key: 'max', value: 1 },
] as const;

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
  availableBalance,
  editable = true,
  placeholder,
  style,
  isLoading = false,
  testID,
}: SwapAmountInputProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();

  const showQuickFill = editable && availableBalance !== undefined && !!token;

  const handleQuickFill = useCallback(
    (key: string) => {
      const option = QUICK_FILLS.find((fill) => fill.key === key);
      if (!option || availableBalance === undefined || !token) return;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(availableBalance * option.value * 10 ** decimals) / 10 ** decimals;
      onChangeValue(truncated > 0 ? truncated.toString() : '0');
    },
    [availableBalance, token, onChangeValue]
  );

  const quickFillOptions = useMemo(
    () =>
      QUICK_FILLS.map((fill) => ({
        key: fill.key,
        label: fill.key === 'max' ? t('general.max') : `${fill.key}%`,
      })),
    [t]
  );

  return (
    <div
      data-testid={testID}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}
    >
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

      <Card padding="md" radius="lg" className={editable ? FIELD_SHELL_CLASS : undefined}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {isLoading ? (
            <PendingValue pending style={{ flex: 1 }}>
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: fontSize.bodyLg,
                  fontWeight: fontWeight.bold,
                  color: semantic.text.secondary,
                }}
              >
                …
              </span>
            </PendingValue>
          ) : (
            <input
              data-testid={testID ? `${testID}-amount` : undefined}
              inputMode="decimal"
              placeholder={placeholder ?? t('swap.enter_amount')}
              value={value}
              readOnly={!editable}
              onChange={(event) => onChangeValue(sanitizeDecimalInput(event.target.value))}
              aria-label={label}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                background: 'transparent',
                fontFamily: fontFamily.sans,
                fontSize: fontSize.bodyLg,
                fontWeight: fontWeight.bold,
                color: semantic.text.primary,
                ...tabularNums.css,
                ...focusRingNone,
              }}
            />
          )}

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
            <CaretDownIcon size={componentSizes.iconSizeSmall} color={semantic.text.secondary} />
          </button>
        </div>
      </Card>

      {(usdValue !== undefined || availableBalance !== undefined) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.sm,
              color: semantic.text.primary,
            }}
          >
            <span style={{ fontWeight: fontWeight.bold, ...tabularNums.css }}>
              {formatPrecise(usdValue !== undefined ? Math.floor(usdValue * 100) / 100 : undefined)}{' '}
              {currency.toUpperCase()}
            </span>
            {showQuickFill ? (
              <ChipGroup
                testID={testID ? `${testID}-quick-fill` : undefined}
                options={quickFillOptions}
                value=""
                onChange={handleQuickFill}
                size="sm"
              />
            ) : availableBalance !== undefined && token ? (
              <span style={tabularNums.css}>
                {t('swap.available_balance', {
                  balance: formatTokenBalance(availableBalance),
                  symbol: token.symbol,
                })}
              </span>
            ) : null}
          </div>
          {showQuickFill && availableBalance !== undefined && token && (
            <span
              style={{
                alignSelf: 'flex-end',
                fontFamily: fontFamily.sans,
                fontSize: fontSize.sm,
                color: semantic.text.primary,
                ...tabularNums.css,
              }}
            >
              {t('swap.available_balance', {
                balance: formatTokenBalance(availableBalance),
                symbol: token.symbol,
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
