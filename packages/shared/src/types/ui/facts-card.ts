import type { KeyValueRowPropsBase } from './key-value-row';
import type { Testable } from './testable';

/** One fact in the card: a `KeyValueRow`'s props, plus the list key. */
export interface FactsCardRow extends KeyValueRowPropsBase {
  key: string;
}

/**
 * FactsCard — a `Card` of `KeyValueRow`s under an optional bold title.
 *
 * The shape a position, a review and a receipt all take: a heading line that
 * names what the facts are about, then the facts themselves, right-aligned in
 * one column. It exists so a Powerup composing facts writes no title line of
 * its own (`docs/POWERUPS-UI.md` §1.10); the card's padding, gap, radius and
 * the title's type are fixed here for both twins.
 *
 * A card with no title is the plain fact list — the Powerups detail's "made
 * by / networks" card, the swap receipt's fine print.
 */
export interface FactsCardPropsBase extends Testable {
  /** The bold line over the facts. Omitted, the card is only the facts. */
  title?: string;
  rows: readonly FactsCardRow[];
}
