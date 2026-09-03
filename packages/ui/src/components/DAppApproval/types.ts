import type {
  DAppConnectApprovalViewPropsBase,
  DAppSignInApprovalViewPropsBase,
  DAppSignMessageApprovalViewPropsBase,
  DAppTransactionApprovalViewPropsBase,
  TransactionEffectsCardPropsBase,
} from '@salmon/shared';

export type { SiwsFields } from '@salmon/shared';

/** The DOM halves of the approval contracts — nothing added: the gate shows
 * exactly what the contract carries. */
export type DAppConnectApprovalViewProps = DAppConnectApprovalViewPropsBase;
export type DAppSignMessageApprovalViewProps = DAppSignMessageApprovalViewPropsBase;
export type DAppSignInApprovalViewProps = DAppSignInApprovalViewPropsBase;
export type DAppTransactionApprovalViewProps = DAppTransactionApprovalViewPropsBase;
export type TransactionEffectsCardProps = TransactionEffectsCardPropsBase;
