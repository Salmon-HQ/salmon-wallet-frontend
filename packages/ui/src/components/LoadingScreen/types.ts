/**
 * LoadingScreen types, on the DOM.
 */
import type { LoadingScreenPropsBase } from '@salmon/shared';

/**
 * Props for the LoadingScreen component (React DOM)
 * Extends the shared contract with the DOM's own option.
 */
export interface LoadingScreenProps extends LoadingScreenPropsBase {
  /**
   * Drop the water column and wait on flat ground instead.
   *
   * The Bedrock Rule, not a style switch: a wait that happens *inside the dApp
   * approval flow* must show nothing living through itself, the same as the
   * approval screens it sits between. It is DOM-local because the flow is —
   * mobile has no approval surface to guard.
   *
   * @default false
   */
  bedrock?: boolean;
}
