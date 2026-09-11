/**
 * SwapInputScreen — the Swap Powerup's form, on the DOM: pair, amounts, the
 * notice slot and the swap control, drawn with the same amount-card and
 * percent-pill row Send's amount step uses (CORE 05). The next screen is
 * core's confirmation, not the Powerup's. The mobile twin is
 * `apps/mobile/src/components/SwapScreen/SwapInputScreen.tsx`.
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, fontWeight, lineHeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { SwapAmountInput } from './SwapAmountInput';
import type { SwapInputScreenProps } from './types';

/** The four fills Send's amount step draws (CORE 05). `1` is MAX. */
const SHORTCUTS = [
  { key: '25', value: 0.25 },
  { key: '50', value: 0.5 },
  { key: '75', value: 0.75 },
  { key: 'max', value: 1 },
] as const;

export function SwapInputScreen({
  inToken,
  outToken,
  inAmount,
  outAmount,
  onInAmountChange,
  onInTokenPress,
  onOutTokenPress,
  inUsdValue,
  isLoadingQuote = false,
  canSwap,
  reviewWarning,
  swapError,
  attribution,
  onSwap,
  style,
}: SwapInputScreenProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  const notice = (message: typeof swapError) =>
    !message ? null : typeof message === 'string' ? t(message) : t(message.key, message.params);

  const handleShortcut = useCallback(
    (key: string) => {
      const option = SHORTCUTS.find((shortcut) => shortcut.key === key);
      if (!option || !inToken || inToken.balance === undefined) return;
      const decimals = inToken.decimals ?? 9;
      const truncated =
        Math.floor(inToken.balance * option.value * 10 ** decimals) / 10 ** decimals;
      onInAmountChange(truncated > 0 ? truncated.toString() : '0');
    },
    [inToken, onInAmountChange]
  );

  const shortcutOptions = useMemo(
    () =>
      SHORTCUTS.map((shortcut) => ({
        key: shortcut.key,
        label: shortcut.key === 'max' ? t('general.max') : `${shortcut.key}%`,
      })),
    [t]
  );

  return (
    <div
      data-testid="swap-input-screen"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...style }}
    >
      {/* The form lives in Home's content region now, under the balance block
          and the sub-tab row (spec 027): in a short panel the two amount
          fields and the attribution no longer fit it. They scroll; the CTA
          stays pinned to the bottom of the region. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing['2xl'],
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <SwapAmountInput
          testID="swap-from"
          label={t('swap.you_send', 'You Send')}
          value={inAmount}
          onChangeValue={onInAmountChange}
          token={inToken}
          onTokenPress={onInTokenPress}
          usdValue={inUsdValue}
          editable
        />

        {inToken && inToken.balance !== undefined && (
          <ChipGroup
            testID="swap-shortcuts"
            options={shortcutOptions}
            // A shortcut is an action, not a selection: nothing stays lit.
            value=""
            onChange={handleShortcut}
            size="md"
          />
        )}

        {/* The notice slot, reserved: one line of height from the first
            frame, filled when there is something to say, so the "You
            Receive" block never travels under the pointer. */}
        <div
          data-testid="swap-notice-slot"
          style={{
            minHeight: fontSize.sm * lineHeight.normal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily.sans,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            textAlign: 'center',
          }}
        >
          {swapError ? (
            <span
              data-testid="swap-error-text"
              role="alert"
              style={{ color: semantic.status.danger }}
            >
              {notice(swapError)}
            </span>
          ) : reviewWarning ? (
            <span data-testid="swap-warning-text" style={{ color: semantic.status.warning }}>
              {notice(reviewWarning)}
            </span>
          ) : null}
        </div>

        <SwapAmountInput
          testID="swap-to"
          label={t('swap.you_receive', 'You Receive')}
          value={outAmount}
          onChangeValue={() => {}}
          token={outToken}
          onTokenPress={onOutTokenPress}
          editable={false}
          placeholder="0"
          isLoading={isLoadingQuote}
        />

        {/* The fee is a line on the confirmation, never folded into the quote;
            the provider is named from the quote itself (spec 027 §7). */}
        <span
          data-testid="swap-attribution"
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.micro,
            color: semantic.text.tertiary,
            textAlign: 'center',
          }}
        >
          {attribution ?? t('swap.fee_disclaimer')}
        </span>
      </div>

      {/* The scroller above takes the slack; this is the seam before the CTA,
          which sits on the bottom edge of Home's content region. */}
      <div style={{ paddingTop: spacing.lg }} />

      <PrimaryButton testID="swap-submit-button" onPress={onSwap} disabled={!canSwap}>
        {t('swap.swap_now', 'Swap')}
      </PrimaryButton>
    </div>
  );
}
