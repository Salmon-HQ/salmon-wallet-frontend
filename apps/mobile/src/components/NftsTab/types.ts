import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
/**
 * Props for the NFTs sub-tab.
 *
 * The tab owns the only scroll view inside Home's content region; everything
 * above that region — the wallet header, the balance and the sub-tab row — is
 * the Home shell's, laid out in flow and fixed.
 */
export interface NftsTabProps {
  /**
   * Merged into the grid's own content container. The Home shell owns the
   * screen gutter for every sub-tab, so the tab does not draw one of its own.
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Lets the host fade its seam in off the same scroll offset. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}
