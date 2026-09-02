import type { Token } from '../index';
import type { ValidationState } from '../validation';

/**
 * The four send screens — recipient, amount, review, receipt. Routes on
 * mobile (`app/(app)/send/*`), one component stepping through the same four
 * on the DOM (`SendPage`).
 */
export type SendStep = 'recipient' | 'amount' | 'review' | 'success';

/**
 * Token data for the send flow (extends Token with decimals)
 */
export interface SendToken extends Token {
  /** Token decimals for raw amount conversion */
  decimals?: number;
}

/** Who the transfer pays, and what the screens call them. */
export interface SendRecipient {
  /** Exactly what the user typed or tapped — a raw address or a domain. */
  address: string;
  /** The address the transfer will actually pay, when a domain resolved. */
  resolvedAddress?: string;
  /** The address book's or the wallet list's name for it, when there is one. */
  name?: string;
}

/**
 * RecipientInput — the address field of CORE 04. It renders state, it does
 * not compute it: `useAddressValidation` stays in the screen, which is also
 * what decides whether Continue is live. Mobile adds the QR scan affordance;
 * the DOM offers paste instead.
 */
export interface RecipientInputPropsBase {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  validationState: ValidationState;
  isValidating: boolean;
  testID?: string;
  /**
   * Prefix for the field's own testIDs (`${prefix}-recipient-input`, and the
   * scan/paste control). Defaults to `'send'`; the address-book panels pass
   * their own.
   */
  testIDPrefix?: string;
}

/**
 * TokenSelectList — the send flow's token picker, one pick per opening: the
 * `SearchField` pill, then a `ListRow` per token.
 */
export interface TokenSelectListPropsBase {
  /** Available tokens */
  tokens: SendToken[];
  /** Callback when a token is selected */
  onSelectToken: (token: SendToken) => void;
  /** Show unverified/unknown tokens */
  showUnverifiedTokens?: boolean;
  /** Whether token data is still loading (shows skeleton when true) */
  loading?: boolean;
}

/** @deprecated Read `TokenSelectListPropsBase`. */
export type StepTokenSelectProps = TokenSelectListPropsBase;

/**
 * TokenPickerSheet — the picker inside a sheet, opened by the recipient
 * screen up front and by the review screen's "Change".
 */
export interface TokenPickerSheetPropsBase extends TokenSelectListPropsBase {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  showUnverifiedTokens: boolean;
  testID?: string;
}

/**
 * SendFailure — the report on the surface the wait was standing on: what did
 * not happen, the action that tries again without leaving, the way out.
 */
export interface SendFailurePropsBase {
  /** Heading: what did not happen. */
  title: string;
  /** Why, in the user's language. */
  message: string;
  /** Re-run the same transfer, without leaving this screen. */
  onRetry: () => void;
  /** Retry's label. */
  retryLabel: string;
  /** Label for the way out of the failure. */
  dismissLabel: string;
  /** Leave the flow. */
  onDismiss: () => void;
}

// ============================================================================
// Send contact selector types
// ============================================================================

/**
 * A contact from the address book, filtered for the send flow.
 */
export interface SendContact {
  /** User-defined label */
  name: string;
  /** Blockchain address */
  address: string;
  /** Human-readable network name */
  networkName: string;
  /** Blockchain type (e.g., 'solana', 'ethereum', 'bitcoin') */
  blockchain: string;
  /** Optional domain name (e.g., .sol, .eth) */
  domain?: string | null;
}

/**
 * One of the user's own wallet addresses on the active network.
 */
export interface SendOwnWallet {
  /** Account name (e.g., "Account #1") */
  accountName: string;
  /** Blockchain address */
  address: string;
}

/**
 * Return type for the useSendContacts hook.
 */
export interface UseSendContactsResult {
  /** Address book contacts matching the active network, excluding the sender */
  contacts: SendContact[];
  /** User's other wallets on the active network, excluding the sender */
  ownWallets: SendOwnWallet[];
  /** Whether address book data is still loading */
  isLoading: boolean;
}
