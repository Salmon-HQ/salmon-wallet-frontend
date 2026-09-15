import type { TransferRequestSettlement } from '../../blockchain/solana/transfer-request-settlement';
import type { SolanaNetworkId } from '../../types/blockchain';

/**
 * What the receiver keeps: one request, on the device that made it. `status`
 * only ever moves pending → paid; "expired" is judged on read from
 * `expiresAt`, so a request never has to be visited to expire.
 */
export interface PaymentRequest {
  /** `pr_` + the first twelve characters of the reference; doubles as the memo. */
  id: string;
  accountId: string;
  networkId: SolanaNetworkId;
  /** The account's address on that network. */
  recipient: string;
  mint: string;
  decimals: number;
  symbol: string;
  /** Integer string, atomic units. */
  amountAtomic: string;
  /** May be empty; becomes the request's `message`. */
  note: string;
  /** A fresh public key; only the public half ever existed here. */
  reference: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'paid';
  settlement?: TransferRequestSettlement;
  lastCheckedAt?: number;
  lastCheckError?: boolean;
}

export type PaymentRequestState = 'pending' | 'paid' | 'expired';

export type ExpiryKey = 'h1' | 'h24' | 'd7';

/** The Powerup's slice of the persisted Powerup state: lists keyed by `${accountId}:${networkId}`. */
export interface PaymentsState {
  requests: Readonly<Record<string, readonly PaymentRequest[]>>;
}
