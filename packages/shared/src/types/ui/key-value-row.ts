import type { ReactNode } from 'react';

import type { Testable } from './testable';

/** The four inks a value can take. A label is always secondary. */
export type KeyValueTone = 'primary' | 'success' | 'danger' | 'secondary';

export interface KeyValueRowPropsBase extends Testable {
  label: string;
  /**
   * A string is drawn in the row's own value style. A node is drawn as it
   * arrives, for a value the row cannot style as one typeface — an address,
   * which the Monospace-Is-For-Scanning Rule pins to Geist Mono.
   */
  value: string | ReactNode;
  valueTone?: KeyValueTone;
  /** 600 is the emphasised label a summary row uses; 500 is the default. */
  labelWeight?: 500 | 600;
  /** A control drawn after the value — the one place a row carries an action. */
  action?: ReactNode;
  /**
   * `inline` (default) sets the value beside the label on one line, clipped.
   * `stacked` sets the label over the value and lets the value wrap — the
   * row a full address, a hash or a URI needs, where clipping would hide the
   * very thing the user is asked to check.
   */
  layout?: 'inline' | 'stacked';
  /** `mono` draws a string value in the scanning face (Geist Mono). */
  valueFont?: 'sans' | 'mono';
}
