/**
 * Send · review and sign — CORE 06, on the DOM.
 *
 * The mobile twin is `apps/mobile/app/(app)/send/review.tsx` — and, with a
 * collectible, `app/(app)/nft/[id]/review.tsx`. The last screen before the
 * money moves: the fee is the flow's own estimate, confirm calls the flow's
 * `submit`, and there is no spinner on the control — the tap hands the screen
 * to the wait. A failed transfer is not reported here; the passage owns it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  chunkAddress,
  formatTokenAmount,
  getShortAddress,
  spacing,
  type NftData,
  type SendRecipient,
  type SendToken,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { WarningNotice } from '../WarningNotice';
import { SendScreen } from './SendScreen';
import { TokenPickerSheet } from './TokenPickerSheet';

export interface StepReviewProps {
  recipient: SendRecipient;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  /** The commit is in flight: the controls and the back go dead. */
  isSending: boolean;
  /** The token half. */
  token: SendToken | null;
  tokens: SendToken[];
  tokensLoading: boolean;
  amount: string;
  estimatedFee: string | null;
  estimateFee: () => void;
  feeEstimateFailed: boolean;
  /** A token picked here that no longer covers the amount sends the user back. */
  onSelectToken: (token: SendToken) => void;
  /** The collectible half. */
  nft?: NftData | null;
  /** The collectible's own failure, drawn on the card as mobile does. */
  nftError?: string | null;
}

export function StepReview({
  recipient,
  onBack,
  onCancel,
  onConfirm,
  isSending,
  token,
  tokens,
  tokensLoading,
  amount,
  estimatedFee,
  estimateFee,
  feeEstimateFailed,
  onSelectToken,
  nft,
  nftError,
}: StepReviewProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [pickerOpen, setPickerOpen] = useState(false);

  // What the transfer will actually pay. When a domain was typed, the
  // resolved address is the destination — showing the domain here would ask
  // the user to sign for something this screen never displayed.
  const destinationAddress = recipient.resolvedAddress || recipient.address;
  const resolvedFromDomain =
    recipient.resolvedAddress && recipient.resolvedAddress !== recipient.address
      ? recipient.address
      : null;

  // Ask only if the flow is not already holding the answer for this pair.
  useEffect(() => {
    if (!nft && !estimatedFee) estimateFee();
  }, [nft, estimatedFee, estimateFee]);

  const handleSelectToken = useCallback(
    (next: SendToken) => {
      onSelectToken(next);
      setPickerOpen(false);
    },
    [onSelectToken]
  );

  const amountDisplay = token ? `${formatTokenAmount(parseFloat(amount))} ${token.symbol}` : '';

  if (nft) {
    return (
      <SendScreen
        testID="nft-send-review-screen"
        onBack={onBack}
        backDisabled={isSending}
        title={t('nft.send.reviewTitle')}
        subtitle={nft.name}
        action={
          <PrimaryButton
            testID="nft-send-confirm-button"
            onPress={onConfirm}
            disabled={isSending}
            loading={isSending}
          >
            {t('actions.send')}
          </PrimaryButton>
        }
      >
        <Card padding="lg" gap={spacing.md} testID="nft-send-review-summary">
          <KeyValueRow label={t('nft.detail.title')} value={nft.name ?? ''} />
          {!!nft.collectionName && (
            <KeyValueRow
              label={t('nft.detail.collection')}
              value={nft.collectionName}
              valueTone="secondary"
            />
          )}
          <KeyValueRow
            testID="nft-send-review-recipient"
            label={t('token.send.recipient')}
            value={getShortAddress(destinationAddress) ?? destinationAddress}
          />
          {resolvedFromDomain !== null && (
            <KeyValueRow
              testID="nft-send-review-resolved-from"
              label={t('send.recipient')}
              value={resolvedFromDomain}
              valueTone="secondary"
            />
          )}
        </Card>

        {!!nftError && <WarningNotice tone="error" title={t(nftError)} />}
      </SendScreen>
    );
  }

  return (
    <SendScreen
      testID="send-review-screen"
      onBack={onBack}
      backDisabled={isSending}
      title={t('send.screens.reviewTitle')}
      subtitle={t('send.screens.reviewSubtitle')}
      action={
        <>
          {/* The cancel sits above the commit: the decision reads down to the
              control that performs it. */}
          <SecondaryButton
            testID="send-confirm-cancel-button"
            onPress={onCancel}
            disabled={isSending}
          >
            {t('actions.cancel')}
          </SecondaryButton>
          <PrimaryButton testID="send-confirm-button" onPress={onConfirm} disabled={isSending}>
            {t('actions.confirm')}
          </PrimaryButton>
        </>
      }
    >
      <Card padding="lg" gap={spacing.md} testID="send-review-summary">
        {/* The one row that carries an action: a wrong token picked on the
            recipient step is fixed here rather than by starting over. */}
        <KeyValueRow
          testID="send-confirm-amount"
          label={t('token.send.amountLabel')}
          value={amountDisplay}
          action={
            <TextButton
              testID="send-review-change-token"
              onPress={() => setPickerOpen(true)}
              color={semantic.text.accent}
            >
              {t('actions.change')}
            </TextButton>
          }
        />
        <KeyValueRow
          label={t('transactions.to')}
          value={recipient.name ?? getShortAddress(destinationAddress) ?? destinationAddress}
        />
        {/* Mono in 4-character chunks: fixed-width chunks are what let the
            eye compare a prefix and suffix positionally. */}
        <KeyValueRow
          testID="send-confirm-address"
          label={t('send.screens.address')}
          value={chunkAddress(destinationAddress)}
        />
        {resolvedFromDomain !== null && (
          <KeyValueRow
            testID="send-confirm-resolved-from"
            label={t('send.recipient')}
            value={resolvedFromDomain}
            valueTone="secondary"
          />
        )}
        <KeyValueRow
          testID="send-review-fee"
          label={t('token.send.networkFee')}
          value={estimatedFee ? `~${estimatedFee}` : '—'}
          valueTone={estimatedFee ? 'primary' : 'secondary'}
        />
      </Card>

      {/* Estimation failure keeps the row visible as a notice instead of
          hiding it; confirming stays enabled, exactly as before. */}
      {feeEstimateFailed && !estimatedFee && (
        <WarningNotice
          tone="warning"
          title={t('send.fee_estimate_failed')}
          testID="send-fee-estimate-failed"
        />
      )}

      <TokenPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tokens={tokens}
        loading={tokensLoading}
        onSelectToken={handleSelectToken}
      />
    </SendScreen>
  );
}
