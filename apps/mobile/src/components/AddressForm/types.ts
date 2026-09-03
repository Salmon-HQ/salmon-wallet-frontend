import type { AddressFormPropsBase, BlockchainType } from '@salmon/shared';

/** The RN half of `AddressFormPropsBase`: the scanner's chain and the field's wording. */
export interface AddressFormProps extends AddressFormPropsBase {
  /** Which chain the QR scanner reads for. */
  blockchain: BlockchainType;
  addressPlaceholder: string;
}
