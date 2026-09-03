import type { ReactNode } from 'react';

import type { Testable } from './testable';

/** SheetTitle — the one title style every sheet draws (24 semibold, centred). */
export interface SheetTitlePropsBase {
  /** Optional element drawn before the title text, inline (e.g. a warning icon). */
  leading?: ReactNode;
  children: string;
}

/**
 * The cross-platform half of a bottom sheet: visibility, the two close
 * signals, the header slots and the dismissal switch. Everything about *how*
 * it leaves — drag on native, Escape and backdrop on the DOM — is platform
 * code and stays out of this contract.
 */
export interface BottomSheetContainerPropsBase extends Testable {
  /** Controls sheet visibility. */
  visible: boolean;
  /** The request to leave, fired the moment it is asked for. */
  onClose: () => void;
  /** The arrival: fired once the sheet has actually left the screen. */
  onClosed?: () => void;
  children: ReactNode;
  /** Title drawn in the drag area. Mutually exclusive with `headerContent`. */
  title?: ReactNode;
  /** Full header row, replacing `title`. */
  headerContent?: ReactNode;
  /** Whether the sheet may be dismissed by the platform's dismiss gesture. */
  dismissible?: boolean;
}
