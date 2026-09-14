/**
 * A build envelope → the `TransactionProposal` core signs (spec 029 §5.1).
 * The client builds the rows from typed fields — the Powerup passes them in
 * already translated, exactly as `powerups/swap/proposal.ts` does — and the
 * envelope supplies what every Powerup shares: the bytes, the expiry, the
 * data-provider attribution and who made the Powerup.
 */
import type { SolanaNetworkId } from '../../types/blockchain';
import type { ProposalDisplay, TransactionProposal } from '../../core/confirmation/types';
import type { PowerupBuildEnvelope } from './types';
import type { DeclaredTransactionEffects } from '../../core/verify';

export interface PowerupProposalContext {
  networkId: SolanaNetworkId;
  /**
   * What the Powerup's transaction may do — its manifest's `programs`, and any
   * account the flow knows the transaction has to name. Core checks the bytes
   * against it before the user signs.
   */
  expect: DeclaredTransactionEffects;
  /** The rendering the Powerup resolved; attribution and contributor come from the envelope. */
  display: Omit<ProposalDisplay, 'attribution' | 'contributor'>;
  /** How the pending banner reports the signed transaction. */
  pending?: TransactionProposal['pending'];
  refresh?: () => Promise<TransactionProposal>;
}

export function powerupProposalId(envelope: PowerupBuildEnvelope): string {
  return `${envelope.expiresAt}:${envelope.transaction.slice(0, 32)}`;
}

export function toPowerupProposal(
  envelope: PowerupBuildEnvelope,
  { networkId, display, expect, pending, refresh }: PowerupProposalContext
): TransactionProposal {
  return {
    id: powerupProposalId(envelope),
    networkId,
    expect,
    transaction: envelope.transaction,
    expiresAt: envelope.expiresAt,
    refresh,
    pending,
    display: {
      ...display,
      attribution: envelope.attribution ?? undefined,
      contributor: envelope.contributor ?? undefined,
    },
  };
}
