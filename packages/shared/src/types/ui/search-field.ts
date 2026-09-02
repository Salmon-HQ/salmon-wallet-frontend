import type { Testable } from './testable';

export interface SearchFieldPropsBase extends Testable {
  value: string;
  onChangeText: (text: string) => void;
  /** Doubles as the spoken name unless `accessibilityLabel` says otherwise. */
  placeholder: string;
  accessibilityLabel?: string;
}
