import type { ViewStyle } from 'react-native';
import type { ReceiveSheetPropsBase } from '@salmon/shared';

/**
 * Props for the ReceiveSheet component (React Native).
 *
 * `networkLabel` lives on the shared contract now (spec 028 lot 3) — the DOM
 * sheet names the environment for the same reason mobile does.
 */
export type ReceiveSheetProps = ReceiveSheetPropsBase<ViewStyle>;
