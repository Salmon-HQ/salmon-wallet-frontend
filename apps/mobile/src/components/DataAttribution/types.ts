import type { StyleProp, ViewStyle } from 'react-native';
import type { DataAttributionPropsBase } from '@salmon/shared';

/** The mobile half of `DataAttributionPropsBase`: the contract plus a style. */
export interface DataAttributionProps extends DataAttributionPropsBase<StyleProp<ViewStyle>> {}
