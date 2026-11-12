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
