/**
 * The envelope every transaction-building Powerup receives from the Salmon
 * backend (spec 029 §5.1), flat, with the Powerup's own typed display fields
 * spread beside it.
 */

/** A fee the build charges, as the backend states it. */
export interface PowerupFeeLine {
  amount: string;
  mint: string;
  /**
   * `output`: taken from the output token, `output.amount` already net of it.
   * `input`: deducted from the input token before routing — the user's debit
   * is `input.amount`, of which `amount` goes to Salmon.
   */
  side: 'input' | 'output';
}

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
  salmonFee: PowerupFeeLine | null;
  routeFee: PowerupFeeLine | null;
  contributor: PowerupContributor | null;
  priorityFeeMicroLamports?: number;
  computeUnitLimit?: number | null;
}
