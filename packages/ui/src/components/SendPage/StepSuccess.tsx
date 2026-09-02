/**
 * Send · the receipt — CORE 07, on the DOM.
 *
 * The mobile twin is `apps/mobile/app/(app)/send/success.tsx` — and, with a
 * collectible, `app/(app)/nft/[id]/success.tsx`. Composed from
 * `ReceiptScreen tone="transfer"`; this step only supplies the flow's data
 * and the route-level chrome (the water). The receipt arrives whole: no
 * entrance of its own, and no way back to the signature behind it.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatTokenAmount,
  getDefaultExplorer,
  getShortAddress,
  getTransactionUrl,
  type Blockchain,
  type BlockchainAccount,
  type BlockchainType,
  type NetworkEnvironment,
  type NftData,
  type SendRecipient,
  type SendToken,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { DepthBackground } from '../DepthBackground';
import { ReceiptScreen } from '../ReceiptScreen';
import { ScalesBackground } from '../ScalesBackground';

export interface StepSuccessProps {
  account: BlockchainAccount;
  blockchain: BlockchainType;
  txId: string;
  recipient: SendRecipient;
  onContinue: () => void;
  /** True while settlement waits for the indexer; gates the receipt's CTA. */
  settling?: boolean;
  token?: SendToken | null;
  amount?: string;
  nft?: NftData | null;
}

export function StepSuccess({
  account,
  blockchain,
  txId,
  recipient,
  onContinue,
  settling = false,
  token,
  amount = '',
  nft,
}: StepSuccessProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  const destination = recipient.resolvedAddress || recipient.address;
  const recipientName = recipient.name ?? getShortAddress(destination) ?? destination;
  const chain = (nft?.blockchain ?? blockchain).toUpperCase() as Blockchain;
  const explorerUrl =
    getTransactionUrl(
      chain,
      account.getNetworkId() as NetworkEnvironment,
      getDefaultExplorer(chain),
      txId
    ) ?? undefined;

  const amountDisplay = token ? `${formatTokenAmount(parseFloat(amount))} ${token.symbol}` : '';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: semantic.water.gradient[1],
      }}
    >
      <DepthBackground style={{ zIndex: 0 }} />
      <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {nft ? (
          <ReceiptScreen
            tone="transfer"
            title={t('nft.send.successTitle')}
            body={t('nft.send.successSummary', {
              name: nft.name ?? '',
              address: getShortAddress(destination) ?? destination,
            })}
            rows={[
              {
                label: t('send.screens.status'),
                value: t('transactions.detail.confirmed'),
                valueTone: 'success',
              },
            ]}
            explorerUrl={explorerUrl}
            settling={settling}
            primary={{
              label: t('transaction.continue'),
              onPress: onContinue,
              testID: 'tx-success-continue-button',
            }}
          />
        ) : (
          <ReceiptScreen
            tone="transfer"
            title={t('send.screens.successTitle')}
            body={t('send.screens.successBody', { amount: amountDisplay, name: recipientName })}
            rows={[
              { label: t('token.send.amountLabel'), value: amountDisplay },
              { label: t('transactions.to'), value: recipientName },
              {
                label: t('send.screens.status'),
                value: t('transactions.detail.confirmed'),
                valueTone: 'success',
              },
            ]}
            explorerUrl={explorerUrl}
            settling={settling}
            primary={{
              label: t('transaction.continue'),
              onPress: onContinue,
              testID: 'tx-success-continue-button',
            }}
          />
        )}
      </div>
    </div>
  );
}
