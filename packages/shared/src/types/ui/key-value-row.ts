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
}
