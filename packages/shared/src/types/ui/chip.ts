import type { ReactNode } from 'react';

import type { Testable } from './testable';

/** `sm` is the badge-sized pill; `md` the tappable filter. */
export type ChipSize = 'sm' | 'md';

/**
 * `filter` carries a selected state — the ink well the frames draw when a
 * filter is on. `outline` never fills: it is a label wearing an edge.
 *
 * A chip is for actions and badges, never for selection state in a row of
 * mutually exclusive options — that is `UnderlineTabs` (DESIGN.md
 * §Navigation).
 */
export type ChipVariant = 'filter' | 'outline';

export interface ChipPropsBase extends Testable {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: ChipSize;
  variant?: ChipVariant;
  leadingIcon?: ReactNode;
  /** Overrides the label as the spoken name. */
  accessibilityLabel?: string;
}

export interface ChipOption {
  key: string;
  label: string;
}

export interface ChipGroupPropsBase extends Testable {
  options: ChipOption[];
  value: string;
  onChange: (key: string) => void;
  size?: ChipSize;
  variant?: ChipVariant;
  /** A fixed set that shares the row equally instead of scrolling. */
  fill?: boolean;
}
