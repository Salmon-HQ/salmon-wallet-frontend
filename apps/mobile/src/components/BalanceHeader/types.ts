import type { ViewStyle } from 'react-native';
import type { BalanceHeaderPropsBase } from '@salmon/shared';

/**
 * The mobile half of `BalanceHeaderPropsBase`.
 *
 * The contract extends `BalanceCardCarouselPropsBase`, which is why the block
 * still swipes between chains, still reports `onBlockchainChange` and still
 * honours `activeIndex`: the mobile block was redrawn, not re-specified, and
 * the DOM twin in `packages/ui` reads the same shape.
 */
export type BalanceHeaderProps = BalanceHeaderPropsBase<ViewStyle>;
