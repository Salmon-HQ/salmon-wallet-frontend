import type { Token } from '../index';
import type { Testable } from './testable';

/** Which chain's row layout the list draws — Bitcoin shows no fiat line. */
export type TokenListBlockchain = 'solana' | 'bitcoin' | 'ethereum';

/**
 * One token's row: a `ListRow` with the logo leading, the name as the title,
 * "SYM · price · change" under it and the amount over the fiat value trailing.
 */
export interface TokenListItemPropsBase extends Testable {
  token: Token;
  /** Omit to render the row non-pressable. */
  onPress?: (token: Token) => void;
  /** Privacy mode — every figure prints the hidden value. */
  hiddenBalance?: boolean;
  blockchain?: TokenListBlockchain;
}

/**
 * The Portfolio tab's list of holdings. The skeleton is the list's own empty
 * state while `loading`, never a sibling rendered outside it.
 */
export interface TokenListPropsBase extends Testable {
  tokens: Token[];
  loading?: boolean;
  onTokenPress: (token: Token) => void;
  hiddenBalance?: boolean;
  blockchain?: TokenListBlockchain;
}
