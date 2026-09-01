/**
 * Props for the TokenBadgesSection component (base - platform-agnostic)
 */
export interface TokenBadgesSectionPropsBase<TStyle> {
  /** Array of token tags to display as badges */
  tags?: string[];
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Optional custom styles for the container */
  style?: TStyle;
}
