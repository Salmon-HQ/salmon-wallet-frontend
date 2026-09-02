import type { CSSProperties } from 'react';
import type { Testable, WarningNoticePropsBase } from '@salmon/shared';

export type { WarningNoticeTone } from '@salmon/shared';

/**
 * Props for the WarningNotice component (DOM/Web/Extension).
 */
export interface WarningNoticeProps extends WarningNoticePropsBase, Testable {
  /** Optional container style override (e.g. margins from the parent). */
  style?: CSSProperties;
  className?: string;
}
