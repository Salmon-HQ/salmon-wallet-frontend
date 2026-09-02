import type { Testable } from './testable';

/**
 * The one button contract the three variants share — primary (the salmon
 * fill), secondary (the outlined well) and text (label only). The label is a
 * string, not a node: a button says one thing.
 */
export interface ButtonPropsBase extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
}

/** `text` alone may take an ink override, for a destructive inline action. */
export interface TextButtonPropsBase extends ButtonPropsBase {
  color?: string;
}
