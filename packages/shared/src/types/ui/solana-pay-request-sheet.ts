import type { TransactionRequestLink } from '../../blockchain/solana/transaction-request';
import type { BlockchainAccount } from '../blockchain';

/**
 * One merchant payment, from the link to the receipt: what the Send recipient
 * step mounts while a transaction-request link is open. Mounted only then, so
 * the flow (and core's received door it needs) exists only while it runs.
 */
export interface SolanaPayRequestPropsBase {
  link: TransactionRequestLink;
  /** The account that pays: the active one. */
  account: BlockchainAccount;
  /** The receipt was dismissed: the payment is done, the Send flow closes. */
  onDone: () => void;
  /** The user left (sheet closed, review cancelled, or it failed and was closed). */
  onCancel: () => void;
}

/**
 * The sheet that opens over the Send recipient step when a Solana Pay
 * transaction-request link is scanned or pasted (spec 043), and stays only
 * until core's review is ready. One contract, two twins.
 */
export interface SolanaPayRequestSheetPropsBase {
  visible: boolean;
  /** Known as soon as the link is read; label and icon arrive with the GET. */
  merchant: { domain: string; label?: string; icon?: string | null };
  phase: 'contacting' | 'preparing' | 'failed';
  /** Translation key of the failure, and the merchant's own words when it sent some. */
  error?: { key: string; merchantMessage?: string } | null;
  /** Offered on reachability failures only (FR-009), never on unsafe transactions. */
  onRetry?: () => void;
  onClose: () => void;
}
