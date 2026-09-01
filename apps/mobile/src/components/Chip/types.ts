import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

/** `sm` is the badge-sized pill; `md` the tappable filter. */
export type ChipSize = 'sm' | 'md';

/**
 * `filter` carries a selected state — the ink well the frames draw when a
 * filter is on. `outline` never fills: it is a label wearing an edge.
 */
export type ChipVariant = 'filter' | 'outline';

export interface ChipProps extends Testable {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: ChipSize;
  variant?: ChipVariant;
  leadingIcon?: ReactNode;
  /**
   * Overrides the label as the spoken name. Only for a pill whose visible copy
   * is shorter than the action it performs ("History" → "View activity").
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export interface ChipOption {
  key: string;
  label: string;
}

export interface ChipGroupProps extends Testable {
  options: ChipOption[];
  value: string;
  onChange: (key: string) => void;
  size?: ChipSize;
  variant?: ChipVariant;
  style?: StyleProp<ViewStyle>;
}
