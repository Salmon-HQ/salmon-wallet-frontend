import type {
  RecipientInputPropsBase,
  SendFailurePropsBase,
  TokenPickerSheetPropsBase,
  TokenSelectListPropsBase,
} from '@salmon/shared';

/** The mobile half of `RecipientInputPropsBase`: the contract plus the QR scan affordance. */
export interface RecipientInputProps extends RecipientInputPropsBase {
  onScanPress: () => void;
  scanLabel: string;
}

/** The mobile half of `SendFailurePropsBase`: the contract plus the safe-area inset. */
export interface SendFailureProps extends SendFailurePropsBase {
  /** Bottom safe-area inset — the actions sit on the bottom edge. */
  bottomInset: number;
}

export type TokenPickerSheetProps = TokenPickerSheetPropsBase;

export type TokenSelectListProps = TokenSelectListPropsBase;
