import type { SolanaPayRequestPropsBase, SolanaPayRequestSheetPropsBase } from '@salmon/shared';

/** The DOM half of the merchant sheet: the shared contract as is. */
export interface SolanaPayRequestSheetProps extends SolanaPayRequestSheetPropsBase {}

/** The DOM half of one merchant payment: the shared contract as is. */
export interface SolanaPayRequestProps extends SolanaPayRequestPropsBase {}
