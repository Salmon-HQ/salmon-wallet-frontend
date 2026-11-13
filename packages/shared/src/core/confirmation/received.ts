/**
 * The received entry: how core's own flows (a Solana Pay merchant payment,
 * spec 043) put a transaction someone else built on the confirmation screen.
 *
 * Same parking, one-at-a-time, phrase check, wait and receipt as
 * `requestSignature`, but the proposal carries no declared effects: its bytes
 * are signed as they arrived. That is why it is a separate door. Powerups are
 * lint-blocked from this module, and the Powerup door refuses a proposal
 * marked `source`. Never re-export it from `SignatureRequestContext` or a
 * barrel a Powerup can reach.
 */
import { createContext, useContext } from 'react';
import type { ReceivedTransactionProposal, SignedResult } from './types';

export type RequestReceivedSignature = (
  proposal: ReceivedTransactionProposal
) => Promise<SignedResult>;

/** Provided by `SignatureRequestProvider`; read only through the hook below. */
export const ReceivedSignatureContext = createContext<RequestReceivedSignature | null>(null);

/** Parks a received proposal on core's confirmation screen and waits for the user. */
export function useRequestReceivedSignature(): RequestReceivedSignature {
  const request = useContext(ReceivedSignatureContext);
  if (!request) {
    throw new Error('useRequestReceivedSignature must be used within a SignatureRequestProvider');
  }
  return request;
}
