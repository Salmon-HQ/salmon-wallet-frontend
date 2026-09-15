/**
 * How a transaction reads: its verb, its glyph name, its ink, its status and
 * confirmation labels, its conversion rate and the sentence the activity row says.
 *
 * Shared because the mobile Activity/TransactionDetail and the DOM
 * ActivityPage/TransactionDetail draw the same facts — the two
 * tables used to live once per platform, which is how the wording drifted.
 * Glyphs are names: each platform maps a name to its own
 * icon component; ink is resolved here from the active tokens.
 */
import { chainMarks } from '../theme/brand';
import type { Semantic } from '../theme/semantic';
import type { Transaction, TransactionType } from '../types/transaction';
import { getShortAddress } from './address';
import { getTransactionDescription } from './transactions';

// ============================================================================
// Type
// ============================================================================

/** The glyph a platform draws for a transaction type — a name, not a component. */
export type TransactionTypeGlyph =
  | 'arrowUpRight'
  | 'arrowDownLeft'
  | 'plusCircle'
  | 'fire'
  | 'lock'
  | 'money'
  | 'cube'
  | 'note'
  | 'question';

export interface TransactionTypeDisplay {
  /** English fallback for the verb — `t(TYPE_LABEL_KEYS[type], label)`. */
  label: string;
  glyph: TransactionTypeGlyph;
  /** The mark's ink, resolved from the active tokens. */
  color: string;
}

/** Translation keys for the verbs — resolved via `t()` at the call site. */
export const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  send: 'transactions.detail.sent',
  receive: 'transactions.detail.received',
  mint: 'transactions.detail.minted',
  burn: 'transactions.detail.burned',
  stake: 'transactions.detail.staked',
  loan: 'transactions.detail.loan',
  interaction: 'transactions.detail.interaction',
  memo: 'transactions.detail.memo',
  unknown: 'transactions.detail.unknown',
};

/**
 * A function of the active tokens because `send`/`receive`/`unknown` read
 * theme colour; the rest are the chain marks, invariant across modes.
 */
export const transactionTypeDisplayFor = (
  t: Semantic
): Record<TransactionType, TransactionTypeDisplay> => ({
  // The same arrows the Home Send / Receive buttons wear (owner, 2026-09-11).
  send: { label: 'Sent', glyph: 'arrowUpRight', color: t.change.negative },
  receive: { label: 'Received', glyph: 'arrowDownLeft', color: t.change.positive },
  mint: { label: 'Minted', glyph: 'plusCircle', color: chainMarks.cyan },
  burn: { label: 'Burned', glyph: 'fire', color: chainMarks.orange },
  stake: { label: 'Staked', glyph: 'lock', color: chainMarks.green },
  loan: { label: 'Loan', glyph: 'money', color: chainMarks.amber },
  interaction: { label: 'Interaction', glyph: 'cube', color: chainMarks.blue },
  memo: { label: 'Memo', glyph: 'note', color: chainMarks.pink },
  unknown: { label: 'Unknown', glyph: 'question', color: t.text.secondary },
});

// ============================================================================
// Status and confirmation
// ============================================================================

export type TransactionStatusGlyph = 'checkCircle' | 'xCircle' | 'clock';

export interface TransactionStatusDisplay {
  label: string;
  color: string;
  glyph: TransactionStatusGlyph;
}

export const STATUS_LABEL_KEYS: Record<string, string> = {
  completed: 'transactions.detail.completed',
  failed: 'transactions.detail.failed',
  pending: 'transactions.detail.pending',
};

export const transactionStatusDisplayFor = (
  t: Semantic
): Record<'completed' | 'failed' | 'pending', TransactionStatusDisplay> => ({
  completed: { label: 'Completed', color: t.status.success, glyph: 'checkCircle' },
  failed: { label: 'Failed', color: t.status.danger, glyph: 'xCircle' },
  pending: { label: 'Pending', color: t.status.warning, glyph: 'clock' },
});

/**
 * Resolves a display table's glyph *names* to a platform's icon
 * *components* — the one step `transactionTypeConfigFor` (Activity /
 * ActivityPage) and the TransactionDetail twins' `statusConfigFor`
 * each reimplemented once per platform. The glyph map is the only thing that
 * differs between platforms, so it stays the caller's argument.
 */
export function withPlatformGlyphs<
  Key extends string,
  Glyph extends string,
  IconT,
  Display extends { label: string; color: string; glyph: Glyph },
>(
  displayTable: Record<Key, Display>,
  glyphs: Record<Glyph, IconT>
): Record<Key, { label: string; color: string; icon: IconT }> {
  return Object.fromEntries(
    Object.entries<Display>(displayTable).map(([key, display]) => [
      key,
      { label: display.label, color: display.color, icon: glyphs[display.glyph] },
    ])
  ) as Record<Key, { label: string; color: string; icon: IconT }>;
}

/** The value tones the kit's KeyValueRow offers; confirmation depth is one of them. */
export type ConfirmationTone = 'primary' | 'secondary' | 'success';

/**
 * Confirmation depth, said in the row's value ink. It used to be a tinted
 * badge in three decorative hues; the kit gives a value four tones and this
 * fact is one of them.
 */
export const CONFIRMATION_CONFIG: Record<string, { label: string; tone: ConfirmationTone }> = {
  processed: { label: 'Processed', tone: 'secondary' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  finalized: { label: 'Finalized', tone: 'success' },
};

export const CONFIRMATION_LABEL_KEYS: Record<string, string> = {
  processed: 'transactions.detail.processed',
  confirmed: 'transactions.detail.confirmed',
  finalized: 'transactions.detail.finalized',
};

// ============================================================================
// Derivations
// ============================================================================

/**
 * The other side of a transfer, when there is one: who it went to, or who it
 * came from. `undefined` for anything that is not a plain send/receive.
 */
export function transactionCounterparty(
  transaction: Pick<Transaction, 'type' | 'inputs' | 'outputs'>
): string | undefined {
  const { type, inputs, outputs } = transaction;
  if (type === 'send') return outputs[0]?.destination;
  if (type === 'receive') return inputs[0]?.source;
  return undefined;
}

/** How many characters the short address keeps on each side, as the wallet header. */
export const COUNTERPARTY_ADDRESS_CHARS = 4;

export interface TransactionSentence {
  key: string;
  values?: Record<string, unknown>;
}

/**
 * What the activity row says under the verb. A transfer with a counterparty
 * always says "To/From <someone>", even when the indexer sent prose of its
 * own: the address book's name outranks it, and the short address is the
 * same form the wallet header uses. Everything else keeps the shared
 * description.
 */
export function describeTransactionRow(
  transaction: Pick<Transaction, 'type' | 'inputs' | 'outputs' | 'source' | 'description' | 'memo'>,
  contacts?: Record<string, string>
): TransactionSentence {
  // A memo's sentence is the note itself — the one thing the user wrote.
  if (transaction.type === 'memo' && transaction.memo) {
    return { key: 'transactions.description.memoNote', values: { note: transaction.memo } };
  }
  const counterparty = transactionCounterparty(transaction);
  if (counterparty) {
    const name =
      contacts?.[counterparty] ?? getShortAddress(counterparty, COUNTERPARTY_ADDRESS_CHARS) ?? '';
    return {
      key:
        transaction.type === 'send'
          ? 'transactions.description.sendTo'
          : 'transactions.description.receiveFrom',
      values: { address: name },
    };
  }
  const { type, inputs, outputs, source, description } = transaction;
  const described = getTransactionDescription(type, inputs, outputs, source, description);
  return { key: described.key, values: described.values };
}
