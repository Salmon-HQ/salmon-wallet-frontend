import type { ReactNode } from 'react';
import type { Testable } from './testable';

/**
 * A wallet and the wallets derived from it, drawn as one block: the parent's
 * card, then each derived card stepped in one gutter and tied to the parent
 * by a rail — a line that leaves the parent, runs down the leading edge and
 * meets each derived card at a node. Never collapsible: a family is always
 * open, every wallet in it a card of its own (spec 025, amended 2026-09-09).
 */
export interface WalletFamilyPropsBase extends Testable {
  /** The parent's card. */
  parent: ReactNode;
  /** The derived cards, keyed by wallet id, in the order the rail meets them. */
  derived: readonly { id: string; card: ReactNode }[];
}
