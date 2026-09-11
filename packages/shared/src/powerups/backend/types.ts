/**
 * The envelope every transaction-building Powerup receives from the Salmon
 * backend (spec 029 §5.1): the same shape the swap build carries, flat, with
 * the Powerup's own typed display fields spread beside it.
 */
import type { SwapFeeLine } from '../swap/types';

/** Who authored the Powerup, from the registry entry Salmon maintainers keep. */
export interface PowerupContributor {
  name: string;
  url: string;
}

export interface PowerupBuildEnvelope {
  provider: string | null;
  providerDisplayName: string;
  /** Rendered verbatim on the confirmation, e.g. "Powered by X"; `null` when none. */
  attribution: string | null;
  /** Base64 unsigned v0 transaction, zero signatures, the user as fee payer. */
  transaction: string;
  /** ISO; request a fresh build after this. */
  expiresAt: string;
  salmonFee: SwapFeeLine | null;
  routeFee: SwapFeeLine | null;
  contributor: PowerupContributor | null;
  priorityFeeMicroLamports?: number;
  computeUnitLimit?: number | null;
}
