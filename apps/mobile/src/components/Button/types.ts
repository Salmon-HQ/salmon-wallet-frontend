import type { AccessibilityActionEvent, AccessibilityActionInfo, ViewStyle } from 'react-native';
import type {
  ButtonPropsBase,
  SecondaryButtonPropsBase,
  TextButtonPropsBase,
} from '@salmon/shared';

export type { SecondaryButtonTone } from '@salmon/shared';

/**
 * Actions an assistive technology can perform on the control (React Native's
 * accessibility actions). Mobile only: the hold-to-approve controls give
 * Switch Access, Voice Access, Switch Control and Voice Control a way to
 * commit without holding a finger down.
 */
interface AssistiveActions {
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

export interface PrimaryButtonProps extends ButtonPropsBase, AssistiveActions {
  style?: ViewStyle;
}

export interface SecondaryButtonProps extends SecondaryButtonPropsBase, AssistiveActions {
  style?: ViewStyle;
}

export interface TextButtonProps extends TextButtonPropsBase {
  style?: ViewStyle;
}
