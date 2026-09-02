import type { StyleProp, ViewStyle } from 'react-native';
import type { DerivedAccountFind, Testable } from '@salmon/shared';

/**
 * The sheet that asks which of a seed's funded paths become wallets.
 *
 * One state, so it is a sheet and not a screen (DESIGN.md §Sheets): a list of
 * what the scan found, and two ways to answer. Nothing here can turn into
 * another surface.
 */
export interface DerivedAccountsSheetProps extends Testable {
  visible: boolean;
  /** The paths found. Empty is a real state: a rescan that found nothing. */
  finds: DerivedAccountFind[];
  /** The chosen derivation indexes — one wallet each. */
  onImport: (indexes: number[]) => void;
  /** "Not now", and every other way out of the sheet. */
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}
