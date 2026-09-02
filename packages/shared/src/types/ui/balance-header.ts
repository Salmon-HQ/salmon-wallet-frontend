import type { BalanceCardCarouselPropsBase } from './balance-card';

/**
 * The balance block of the redesigned Home (CORE 01), on every platform.
 *
 * It is still the carousel — the block pages between chains, reports
 * `onBlockchainChange` and honours a controlled `activeIndex` — so it extends
 * the carousel contract rather than forking a second one. What it adds are the
 * two controls that move money and the activity pill, which the old layout
 * kept in a separate `ActionButtonRow`.
 *
 * How a page is turned is the platform's business, not the contract's: mobile
 * swipes, the DOM uses arrow keys, a click on a dot and a horizontal wheel.
 */
export interface BalanceHeaderPropsBase<TStyle> extends BalanceCardCarouselPropsBase<TStyle> {
  /** Opens the send flow. */
  onSendPress?: () => void;
  /** Opens the receive flow. */
  onReceivePress?: () => void;
  /** Opens activity (the "Activity" pill). */
  onActivityPress?: () => void;
  /** Watch-only accounts cannot send. */
  sendDisabled?: boolean;
}
