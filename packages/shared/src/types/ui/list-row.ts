import type { ReactNode } from 'react';

import type { CardTone } from './card';
import type { Testable } from './testable';

/** 14 or 16 — the two internal paddings a row is drawn at. */
export type ListRowPadding = 'md' | 'lg';

/**
 * How loud the title is. `default` is the 14/700 of a recipient or an activity
 * entry; `strong` the 16/700 an asset row carries, where the row *is* the
 * screen's content rather than an index into it.
 */
export type ListRowEmphasis = 'default' | 'strong';

/** ListRow — a `Card` laid out as leading mark / title stack / trailing slot. */
export interface ListRowPropsBase extends Testable {
  /** Usually an `IconBubble`: the row's identity mark. */
  leading: ReactNode;
  title: string;
  /** Sits beside the title on the same line — badges, a tag, a marker. */
  titleAccessory?: ReactNode;
  /**
   * A string is drawn in the row's own secondary style. A node is drawn as it
   * arrives, for a line the row cannot style as one colour.
   */
  subtitle?: ReactNode;
  /** A value, a chevron, a badge — whatever closes the row on the right. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Announced role when pressable. Defaults to `button`; `link` opens a URL. */
  accessibilityRole?: 'button' | 'link';
  /** The ground the row sits on — `Card`'s own tones. */
  tone?: CardTone;
  padding?: ListRowPadding;
  emphasis?: ListRowEmphasis;
  /** Overrides the "title, subtitle" name the row builds for itself. */
  accessibilityLabel?: string;
}
