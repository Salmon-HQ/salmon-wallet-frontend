export interface AuthScreenLayoutProps {
  contained?: boolean;
}

export interface SelectOptionsPageProps extends AuthScreenLayoutProps {
  onCreateWallet: () => void;
  onRecoverWallet: () => void;
  hasAccounts?: boolean;
  onAccessExisting?: () => void;
}

export interface RecoverWalletPageProps extends AuthScreenLayoutProps {
  onComplete: (mnemonic: string) => void;
  onBack: () => void;
}

export interface CreateWalletPageProps extends AuthScreenLayoutProps {
  onComplete: (mnemonic: string) => void;
  onBack: () => void;
}

export interface PasswordPageProps extends AuthScreenLayoutProps {
  mnemonic: string;
  flowType: 'create' | 'recover';
  onCreating?: () => void;
  onSuccess: () => void;
  onBack: () => void;
}

export interface SuccessPageProps extends AuthScreenLayoutProps {
  onGoToWallet: () => void;
  onCheckDerived: () => void;
}

export interface DerivedAccountsPageProps extends AuthScreenLayoutProps {
  onComplete: () => void;
  onBack: () => void;
}

export interface AnalyticsConsentPageProps extends AuthScreenLayoutProps {
  onAccept: () => void;
  onDecline: () => void;
}
