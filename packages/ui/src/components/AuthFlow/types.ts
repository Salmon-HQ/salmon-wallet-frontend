/**
 * Every screen in this flow composes on `OnboardingLayout`, which owns the
 * container. The `contained` prop and `getAuthContainerStyles` that used to
 * live here are gone: the `contained = true` branch described a 380x760 card
 * that no caller ever asked for, and once the grid owned the container the
 * `false` branch had no callers either.
 */
export interface SelectOptionsPageProps {
  onCreateWallet: () => void;
  onRecoverWallet: () => void;
  hasAccounts?: boolean;
  onAccessExisting?: () => void;
}

export interface RecoverWalletPageProps {
  onComplete: (mnemonic: string) => void;
  onBack: () => void;
}

export interface CreateWalletPageProps {
  onComplete: (mnemonic: string) => void;
  onBack: () => void;
}

/** The password step of creating or recovering a wallet from a phrase. */
export interface CreatePasswordPageProps {
  mnemonic: string;
  flowType: 'create' | 'recover';
  onCreating?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

/**
 * The same step for a wallet stored without a password: it lists the wallet's
 * addresses and protects the wallet with the password chosen. There is no way
 * back — nothing else opens until the wallet has a password, or until it is
 * removed.
 */
export interface ProtectPasswordPageProps {
  flowType: 'protect';
  addresses: string[];
  onSuccess: () => void;
  /**
   * Removes the wallet, the same removal as removing every wallet, and leaves
   * for the welcome screen. Runs only once its danger sheet is confirmed.
   */
  onRemoveWallet: () => Promise<void> | void;
}

export type PasswordPageProps = CreatePasswordPageProps | ProtectPasswordPageProps;

export interface SuccessPageProps {
  onGoToWallet: () => void;
}

export interface AnalyticsConsentPageProps {
  onAccept: () => void;
  onDecline: () => void;
}
