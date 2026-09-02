import type { Testable } from './testable';

export interface UnderlineTab {
  key: string;
  label: string;
}

/**
 * `md` is the in-page sub-tab row (16pt labels); `sm` is a filter row —
 * 11/700 uppercase, the scan-mode dressing the copy itself never carries.
 */
export type UnderlineTabsSize = 'md' | 'sm';

export interface UnderlineTabsPropsBase extends Testable {
  tabs: UnderlineTab[];
  activeKey: string;
  onChange: (key: string) => void;
  size?: UnderlineTabsSize;
  /** Each tab gets `${tabTestIDPrefix}-${key}`. */
  tabTestIDPrefix?: string;
  /** The travelling underline's own handle, for tests that watch it move. */
  underlineTestID?: string;
}
