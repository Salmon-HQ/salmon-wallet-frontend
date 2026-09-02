/**
 * Send · how much — CORE 05, on the DOM.
 *
 * The mobile twin is `apps/mobile/app/(app)/send/amount.tsx`. Every number is
 * the sheet's, unchanged: the balance is the live one, the shortcuts fill
 * `balance × percentage` truncated at the token's own decimals (MAX has never
 * subtracted a fee), and "valid" is the same predicate. The fee is one
 * estimate for the whole flow, asked for here and read again by review.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SOL_CONSTANTS,
  fontFamily,
  fontSize,
  fontWeight,
  formatTokenAmount,
  getShortAddress,
  getSolShortfall,
  lineHeight,
  sanitizeDecimalInput,
  spacing,
  tabularNums,
  useCurrencyContext,
  type BlockchainType,
  type SendRecipient,
  type SendToken,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { ChipGroup } from '../Chip';
import { KeyValueRow } from '../KeyValueRow';
import { WarningNotice } from '../WarningNotice';
import { SendScreen } from './SendScreen';

/**
 * The amount being typed, at the size the frames draw it (CORE 05, 46/700).
 * A local constant, as on mobile: the scale tops out at the balance's 38 and
 * this is the one number in the app larger than the total balance.
 */
const AMOUNT_ENTRY_FONT = 46;
/** How long the fee estimate waits before firing, in ms. */
const FEE_DEBOUNCE_MS = 300;

/** The four fills the frames draw. `1` is MAX — the whole balance, as today. */
const SHORTCUTS = [
  { key: '25', value: 0.25 },
  { key: '50', value: 0.5 },
  { key: '75', value: 0.75 },
  { key: 'max', value: 1 },
] as const;

/** Prints a small SOL amount plainly — 0.000005, never 5e-6. */
function formatSolAmount(value: number): string {
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export interface StepAmountProps {
  blockchain: BlockchainType;
  token: SendToken;
  liveBalance: number | undefined;
  nativeBalance: number | undefined;
  recipient: SendRecipient;
  amount: string;
  setAmount: (amount: string) => void;
  estimatedFee: string | null;
  estimateFee: () => void;
  onReview: () => void;
  onBack: () => void;
}

export function StepAmount({
  blockchain,
  token,
  liveBalance,
  nativeBalance,
  recipient,
  amount,
  setAmount,
  estimatedFee,
  estimateFee,
  onReview,
  onBack,
}: StepAmountProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();

  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) return liveBalance;
    return typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : (token.uiAmount ?? 0);
  }, [liveBalance, token.uiAmount]);

  // Every Solana transfer pays its fee in SOL, so a wallet holding this token
  // and no SOL cannot send it — the token balance alone says otherwise.
  const solShortfall = useMemo(() => {
    if (blockchain !== 'solana' || nativeBalance === undefined) return null;
    return getSolShortfall({
      nativeBalanceSol: nativeBalance,
      isTokenTransfer: token.address !== SOL_CONSTANTS.ADDRESS,
    });
  }, [blockchain, nativeBalance, token.address]);

  const isValid = useMemo(() => {
    const numAmount = parseFloat(amount);
    const amountValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= tokenBalance;
    return amountValid && !solShortfall;
  }, [amount, tokenBalance, solShortfall]);

  const handleShortcut = useCallback(
    (key: string) => {
      const option = SHORTCUTS.find((shortcut) => shortcut.key === key);
      if (!option) return;
      const fillAmount = tokenBalance * option.value;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      setAmount(truncated > 0 ? truncated.toString() : '0');
    },
    [tokenBalance, token.decimals, setAmount]
  );

  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fiat = !token.price || numAmount === 0 ? 0 : numAmount * token.price;
    return `≈ ${formatPrecise(fiat)} ${currency.toUpperCase()}`;
  }, [amount, token.price, formatPrecise, currency]);

  const shortcutOptions = useMemo(
    () =>
      SHORTCUTS.map((shortcut) => ({
        key: shortcut.key,
        label: shortcut.key === 'max' ? t('general.max') : `${shortcut.key}%`,
      })),
    [t]
  );

  const recipientShort =
    getShortAddress(recipient.resolvedAddress || recipient.address, 4) ??
    recipient.resolvedAddress ??
    recipient.address;

  // The fee, asked for once the screen settles; the flow no-ops a request for
  // a pair it already holds.
  const hasAmount = parseFloat(amount) > 0;
  useEffect(() => {
    if (!hasAmount) return undefined;
    const timer = setTimeout(estimateFee, FEE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [estimateFee, hasAmount]);

  return (
    <SendScreen
      testID="send-amount-screen"
      onBack={onBack}
      title={`${t('token.action.send')} ${token.symbol}`.trim()}
      subtitle={t('send.screens.amountSubtitle')}
      action={
        <PrimaryButton testID="send-review-button" onPress={onReview} disabled={!isValid}>
          {t('send.screens.reviewTitle')}
        </PrimaryButton>
      }
    >
      {solShortfall !== null && (
        <WarningNotice
          tone="warning"
          title={t('token.send.no_sol_title')}
          testID="send-no-sol-notice"
        >
          {t('token.send.no_sol_body', { amount: formatSolAmount(solShortfall) })}
        </WarningNotice>
      )}

      {/* A bare row, not a card: a caption on the amount entry below it. */}
      <KeyValueRow
        testID="send-selected-token"
        label={t('send.screens.available')}
        value={`${formatTokenAmount(tokenBalance)} ${token.symbol}`}
      />

      {/* The amount. Tabular, so a repoll never reflows the digits. */}
      <Card padding="lg" gap={spacing.base} style={{ alignItems: 'center' }}>
        <div
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
        >
          <input
            data-testid="send-amount-input"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(sanitizeDecimalInput(event.target.value))}
            autoCorrect="off"
            autoComplete="off"
            style={{
              ...tabularNums.css,
              minWidth: 80,
              width: `${Math.max(1, amount.length)}ch`,
              maxWidth: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: AMOUNT_ENTRY_FONT,
              lineHeight: `${AMOUNT_ENTRY_FONT * lineHeight.snug}px`,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.bold,
              color: semantic.text.primary,
              textAlign: 'right',
            }}
          />
          <span
            style={{
              fontSize: fontSize.body,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.bold,
              color: semantic.text.secondary,
            }}
          >
            {token.symbol}
          </span>
        </div>
        <span
          data-testid="send-amount-fiat"
          style={{
            ...tabularNums.css,
            fontSize: fontSize.mono,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            color: semantic.text.secondary,
          }}
        >
          {fiatDisplay}
        </span>
      </Card>

      <ChipGroup
        testID="send-shortcuts"
        options={shortcutOptions}
        // A shortcut is an action, not a selection: nothing stays lit.
        value=""
        onChange={handleShortcut}
        size="md"
        fill
        variant="outline"
      />

      {/* Who this pays, restated where the amount is decided. */}
      <Card padding="sm" gap={spacing.sm} testID="send-amount-recipient">
        <KeyValueRow label={t('transactions.to')} value={recipient.name ?? recipientShort} />
        <KeyValueRow label={t('send.screens.address')} value={recipientShort} />
      </Card>

      {/* What the transfer costs and how long it takes. */}
      <Card padding="sm" gap={spacing.sm} testID="send-amount-fee">
        <KeyValueRow
          testID="send-amount-network-fee"
          label={t('token.send.networkFee')}
          value={estimatedFee ? `~${estimatedFee}` : '—'}
          valueTone={estimatedFee ? 'primary' : 'secondary'}
        />
        <KeyValueRow
          label={t('send.screens.estimatedArrival')}
          value={t('send.screens.arrivalSeconds')}
        />
      </Card>
    </SendScreen>
  );
}
