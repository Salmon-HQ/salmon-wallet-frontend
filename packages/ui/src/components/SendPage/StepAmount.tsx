/**
 * Send · how much — CORE 05, on the DOM.
 *
 * The mobile twin is `apps/mobile/app/(app)/send/amount.tsx`. Every number is
 * the sheet's, unchanged: the balance is the live one, the shortcuts fill
 * `balance × percentage` truncated at the token's own decimals (MAX has never
 * subtracted a fee), and "valid" is the same predicate. The fee is one
 * estimate for the whole flow, asked for here and read again by review.
 */
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SOL_CONSTANTS,
  formatTokenAmount,
  getShortAddress,
  getSolShortfall,
  spacing,
  useCurrencyContext,
  type BlockchainType,
  type SendRecipient,
  type SendToken,
  useAmountShortcuts,
} from '@salmon/shared';

import { AmountEntryCard } from '../AmountEntryCard';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { ChipGroup } from '../Chip';
import { KeyValueRow } from '../KeyValueRow';
import { WarningNotice } from '../WarningNotice';
import { SendScreen } from './SendScreen';

/** How long the fee estimate waits before firing, in ms. */
const FEE_DEBOUNCE_MS = 300;

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

  // The balance fills; a fill stays lit until the user types over it.
  const shortcuts = useAmountShortcuts({
    balance: tokenBalance,
    decimals: token.decimals,
    setAmount,
    maxLabel: t('general.max'),
  });

  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fiat = !token.price || numAmount === 0 ? 0 : numAmount * token.price;
    return `≈ ${formatPrecise(fiat)} ${currency.toUpperCase()}`;
  }, [amount, token.price, formatPrecise, currency]);

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
      <AmountEntryCard
        testID="send-amount"
        value={amount}
        onChangeValue={shortcuts.onAmountChange}
        focused={shortcuts.selected !== ''}
        subtext={fiatDisplay}
      />

      <ChipGroup
        testID="send-shortcuts"
        options={shortcuts.options}
        value={shortcuts.selected}
        onChange={shortcuts.select}
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
