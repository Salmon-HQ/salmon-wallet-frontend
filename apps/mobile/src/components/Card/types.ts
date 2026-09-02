import type { StyleProp, ViewStyle } from 'react-native';
import type { CardPropsBase } from '@salmon/shared';

/**
 * The four tones, the four paddings and the two radii are the cross-platform
 * contract (`packages/shared/src/types/ui/card.ts`) — the DOM twin in
 * `packages/ui` implements the same one. Only the style prop is platform code.
 */
export type { CardPadding, CardRadius, CardTone } from '@salmon/shared';

export interface CardProps extends CardPropsBase {
  style?: StyleProp<ViewStyle>;
}
