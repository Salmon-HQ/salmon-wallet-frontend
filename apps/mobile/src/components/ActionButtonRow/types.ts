import type { ViewStyle } from 'react-native';
import type { ActionButtonBase, ActionButtonRowPropsBase } from '@salmon/shared';

/**
 * Individual action button configuration (React Native)
 */
export interface ActionButton extends ActionButtonBase {
  /** Icon name rendered by ActionButtonRow (custom SVG set) */
  icon: string;
}

/**
 * Props for the ActionButtonRow component (React Native)
 */
export interface ActionButtonRowProps extends ActionButtonRowPropsBase<ViewStyle> {}
