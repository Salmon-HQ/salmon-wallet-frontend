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

export interface PasswordPageProps {
  mnemonic: string;
  flowType: 'create' | 'recover';
  onCreating?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

export interface SuccessPageProps {
  onGoToWallet: () => void;
  onCheckDerived: () => void;
}

export interface DerivedAccountsPageProps {
  onComplete: () => void;
}

export interface AnalyticsConsentPageProps {
  onAccept: () => void;
  onDecline: () => void;
}
