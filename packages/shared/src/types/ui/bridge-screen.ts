/**
 * Network/Chain data for bridge operations
 */
export interface BridgeChain {
  /** Chain identifier (e.g., 'solana', 'ethereum', 'bitcoin') */
  id: string;
  /** Display name (e.g., 'Solana', 'Ethereum', 'Bitcoin') */
  name: string;
  /** Chain symbol (e.g., 'SOL', 'ETH', 'BTC') */
  symbol: string;
  /** Chain logo URL */
  logo?: string;
}

/**
 * Token data for bridge operations
 */
export interface BridgeToken {
  /** Token symbol (e.g., "SOL", "ETH", "USDC") */
  symbol: string;
  /** Token name */
  name: string;
  /** Token logo URL */
  logo?: string;
  /** Network/chain this token is on */
  network?: string;
  /** User's balance of this token */
  balance?: number;
  /** USD price per token */
  usdPrice?: number;
}

/**
 * Bridge estimate data
 */
export interface BridgeEstimate {
  /** Estimated output amount */
  estimatedAmount: number;
  /** Minimum required input amount */
  minAmount: number;
  /** Input token symbol */
  symbolIn: string;
  /** Output token symbol */
  symbolOut: string;
}

/**
 * Bridge exchange details (created exchange)
 */
export interface BridgeExchange {
  /** Exchange ID for tracking */
  id: string;
  /** Deposit address (where user sends funds) */
  depositAddress: string;
  /** Input amount */
  amountIn: number;
  /** Expected output amount */
  amountOut: number;
  /** Input token symbol */
  symbolIn: string;
  /** Output token symbol */
  symbolOut: string;
  /** Destination address */
  addressTo: string;
  /** Exchange status */
  status: string;
}

/**
 * Props for RecipientAddressInput component (base - platform-agnostic)
 */
export interface RecipientAddressInputPropsBase<TStyle> {
  /** Current address value */
  value: string;
  /** Callback when address changes */
  onChangeValue: (value: string) => void;
  /** Target chain/network for validation hints */
  targetChain?: BridgeChain | null;
  /** Label above input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Custom style */
  style?: TStyle;
  /** Error message to display (overrides internal validation messages) */
  error?: string | null;
  /** Callback when address validation completes */
  onValidation?: (result: { isValid: boolean; message: string | null }) => void;
}

/**
 * Props for BridgeRecipientScreen sub-component (base - platform-agnostic)
 */
export interface BridgeRecipientScreenPropsBase<TStyle> {
  /** Recipient address */
  recipientAddress: string;
  /** Callback when address changes */
  onAddressChange: (address: string) => void;
  /** Target chain for the bridge */
  targetChain: BridgeChain | null;
  /** Callback for back button */
  onBack: () => void;
  /** Callback for continue button */
  onContinue: () => void;
  /** Whether address is valid */
  isValidAddress: boolean;
  /** Address validation error */
  addressError?: string | null;
  /** Custom style */
  style?: TStyle;
}

/**
 * Props for BridgeReviewScreen sub-component (base - platform-agnostic)
 */
export interface BridgeReviewScreenPropsBase<TStyle> {
  /** Source token */
  inToken: BridgeToken;
  /** Destination token */
  outToken: BridgeToken;
  /** Input amount */
  inAmount: string;
  /** Estimated output amount */
  outAmount: string;
  /** Recipient address */
  recipientAddress: string;
  /** Bridge estimate data */
  estimate: BridgeEstimate | null;
  /** Callback for back button */
  onBack: () => void;
  /** Callback for confirm button */
  onConfirm: () => void;
  /** Whether confirm is in progress */
  isConfirming?: boolean;
  /** Override label for the confirm button (e.g. countdown or refresh) */
  confirmLabel?: string;
  /** Custom style */
  style?: TStyle;
}
