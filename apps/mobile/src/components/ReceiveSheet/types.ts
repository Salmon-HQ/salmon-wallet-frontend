import type { ViewStyle } from 'react-native';
import type { ReceiveSheetPropsBase } from '@salmon/shared';

/**
 * Props for the ReceiveSheet component (React Native)
 */
export interface ReceiveSheetProps extends ReceiveSheetPropsBase<ViewStyle> {
  /**
   * The environment the address lives on ("Devnet", "Testnet", "Sepolia"), or
   * undefined on mainnet. A deposit sent to a test-network address is not real
   * money, so the sheet says which environment it is asking to be paid on
   * (spec 026 D6). Mobile-only: web and extension keep the shared contract.
   */
  networkLabel?: string;
}
