/**
 * Props for the PendingActivityBanner (base - platform-agnostic).
 *
 * The banner is the visible half of the pending-transaction system: the shared
 * state survives navigation, lock and restart, and this is where the user can
 * see that it did.
 */
import type { PendingActivityItem } from '../../hooks/usePendingActivity';

export interface PendingActivityBannerPropsBase<TStyle> {
  /** Rows to show, in-flight and recently resolved. Empty renders nothing. */
  items: readonly PendingActivityItem[];
  /** Clear an acknowledged row. */
  onDismiss: (id: string) => void;
  /** Additional styles */
  style?: TStyle;
}
