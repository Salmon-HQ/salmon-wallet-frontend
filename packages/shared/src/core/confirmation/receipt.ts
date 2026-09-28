/**
 * A signed proposal → what the host's receipt renders. Pure, so both twins
 * compose the same receipt from the same proposal and the same signature.
 *
 * Everything visible comes from the proposal the user already read: the
 * exchange graphic is the confirmation's own, the title and the rate/fee
 * lines are the Powerup's `display.receipt` copy, and the only thing added
 * is the explorer link for the signature core just broadcast.
 */
import { getDefaultExplorer, getTransactionUrl } from '../../config/explorers';
import type { NetworkEnvironment } from '../../config/explorers';
import type { ProposalDisplay } from './types';
import type { SignatureRequestReceipt } from './SignatureRequestContext';

export interface ConfirmationReceiptView {
  title: string;
  summary: string;
  exchange?: ProposalDisplay['exchange'];
  exchangeRate?: string;
  exchangeFee?: string;
  explorerUrl: string | null;
}

export function buildConfirmationReceipt({
  proposal,
  signature,
}: SignatureRequestReceipt): ConfirmationReceiptView {
  const { display, networkId } = proposal;
  // Every proposal core signs is a Solana one (`TransactionProposal.networkId`
  // is a `SolanaNetworkId`), and the network id is the explorer environment.
  const explorerUrl = getTransactionUrl(
    'SOLANA',
    networkId as NetworkEnvironment,
    getDefaultExplorer('SOLANA'),
    signature
  );

  return {
    title: display.receipt?.title ?? display.title,
    summary: display.pendingSubtitle ?? '',
    exchange: display.exchange,
    exchangeRate: display.receipt?.rate,
    exchangeFee: display.receipt?.fee,
    explorerUrl,
  };
}
