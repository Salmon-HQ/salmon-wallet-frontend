import type { StakeAccountsBodyPropsBase } from '@salmon/shared';

/** The page around the body: the panel's title and its way back. */
export interface StakeAccountsPageProps extends StakeAccountsBodyPropsBase {
  onBack: () => void;
}
