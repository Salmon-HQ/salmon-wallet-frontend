import type { Insets, StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { IconBubblePropsBase } from '@salmon/shared';

export type {
  IconBubbleRadius,
  IconBubbleShape,
  IconBubbleSize,
  IconBubbleTone,
  IconGlyphProps,
} from '@salmon/shared';

/**
 * The RN half of `IconBubblePropsBase`: the cross-platform contract plus the
 * RN-only extras a shared value + slop control needs.
 */
export interface IconBubbleProps extends IconBubblePropsBase {
  /**
   * Pressable only. A bubble under 44pt needs slop to clear the platform touch
   * minimum; the bubble cannot infer how much without knowing its neighbours.
   */
  hitSlop?: Insets;
  /**
   * A rotation in degrees the caller drives itself (the powerups FAB turns its
   * plus into a close mark). It is a shared value rather than a style because
   * the bubble's press scale and this rotation are one `transform` array: two
   * styles each writing `transform` do not merge, the last one wins, and the
   * caller's rotation is the one that silently disappeared.
   */
  rotation?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}
