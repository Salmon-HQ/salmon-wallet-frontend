import type { ViewStyle } from 'react-native';
import type { BalanceCardCarouselPropsBase } from '@salmon/shared';

/**
 * Props for the BalanceHeader component (React Native).
 *
 * Extends the shared carousel contract — the block still swipes between
 * chains and still reports `onBlockchainChange` / honours `activeIndex`, so
 * the host screen's state does not change shape. The additions are the two
 * money actions and the activity pill, which the old layout kept in a
 * separate `ActionButtonRow`; the redesign folds them into the same block.
 */
/*
 * Why it still extends the carousel contract: `BalanceCardCarouselPropsBase`
 * lives in `packages/shared/src/types/ui` and `packages/ui` consumes it for
 * the web and extension balance blocks. The mobile block was redrawn, not
 * re-specified — it still swipes between chains, still reports
 * `onBlockchainChange` and still honours `activeIndex` — so extending the
 * shared shape keeps one cross-platform contract instead of forking a mobile
 * copy that would drift from the other two apps.
 */
export interface BalanceHeaderProps extends BalanceCardCarouselPropsBase<ViewStyle> {
  /** Opens the send flow. */
  onSendPress?: () => void;
  /** Opens the receive flow. */
  onReceivePress?: () => void;
  /** Opens activity (the "History" pill). */
  onActivityPress?: () => void;
  /** Watch-only accounts cannot send. */
  sendDisabled?: boolean;
}
