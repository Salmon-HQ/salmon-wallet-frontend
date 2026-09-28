import type { StyleProp, ViewStyle } from 'react-native';
import type { PowerupsCatalogPropsBase } from '@salmon/shared';

/**
 * The mobile half of `PowerupsCatalogPropsBase`: the contract plus the sheet
 * it is drawn in — visibility, the close signal and the height Home measures
 * (the room under the top of the Portfolio / NFTs row).
 */
export interface PowerupsCatalogProps extends PowerupsCatalogPropsBase {
  visible: boolean;
  onClose: () => void;
  /** The sheet's fixed height, in pixels: the room under the sub-tab row. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}
