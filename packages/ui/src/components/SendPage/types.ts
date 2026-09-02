import type {
  BlockchainAccount,
  BlockchainType,
  NetworkId,
  NftData,
  SendFailurePropsBase,
  SendStep,
  SendToken,
  TokenPickerSheetPropsBase,
  TokenSelectListPropsBase,
} from '@salmon/shared';

export type { SendStep, SendToken, BlockchainType };

/**
 * SendPage — the four send screens as one component (the DOM has no route
 * stack). The host hands it what mobile's `SendFlowProvider` reads from the
 * accounts context; the flow's state lives inside.
 */
export interface SendPageProps {
  /** Available tokens from useBalance */
  tokens: SendToken[];
  /** Blockchain type for address validation and transfer routing */
  blockchain: BlockchainType;
  /** The active network, for the queries a step runs of its own. */
  networkId: NetworkId | null;
  /** The account that signs — the active one, or the NFT's owner. */
  account: BlockchainAccount;
  /**
   * A collectible instead of a token: the flow becomes mobile's
   * `nft/[id]/send` — recipient, review, receipt — with no amount step.
   */
  nft?: NftData | null;
  /** Leave the flow */
  onBack: () => void;
  /** Callback when the transfer completes and the receipt is acknowledged */
  onSuccess?: (txId: string) => void;
  /** Show unverified/unknown tokens */
  showUnverifiedTokens?: boolean;
  /** Whether token data is still loading */
  loading?: boolean;
  /**
   * Reports whether the flow currently owns the screen: true once the
   * transaction has been signed and while its outcome is being reported.
   * Hosts use it to disable navigation that would discard that report.
   */
  onFlowLockChange?: (locked: boolean) => void;
}

/** The DOM half of `SendFailurePropsBase`: nothing platform-specific to add. */
export type SendFailureProps = SendFailurePropsBase;

export type TokenPickerSheetProps = TokenPickerSheetPropsBase;

export type TokenSelectListProps = TokenSelectListPropsBase;
