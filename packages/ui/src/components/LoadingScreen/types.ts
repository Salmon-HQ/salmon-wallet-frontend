/**
 * LoadingScreen types for the extension app
 */
import type { LoadingScreenBaseProps } from '@salmon/shared';

/**
 * Props for the LoadingScreen component (React DOM)
 * Extends base props with web-specific options
 */
export interface LoadingScreenProps extends LoadingScreenBaseProps {
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
