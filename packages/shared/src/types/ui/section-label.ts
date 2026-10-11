import type { Testable } from './testable';

/**
 * `caps` is the tracked uppercase marker ("INSTALLED"), `group` the date or
 * bucket heading inside a list ("Today"), `title` the section heading a block
 * of content hangs under ("Recent activity").
 */
export type SectionLabelVariant = 'caps' | 'group' | 'title';

export interface SectionLabelPropsBase extends Testable {
  children: string;
  variant: SectionLabelVariant;
  /** A figure at the end of the heading's line ("+6,045.71 SKR"). */
  trailing?: string;
  trailingTone?: 'secondary' | 'positive';
}
