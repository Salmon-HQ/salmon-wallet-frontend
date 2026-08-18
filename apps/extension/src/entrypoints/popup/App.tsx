import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccountsContext,
  useAnalyticsConsent,
  useInactivityTimeout,
  useSettleAfterTx,
  useWaitExit,
  useWaitGate,
  DerivedKeyCache,
  type NetworkId,
  type TrustedApp,
} from '@salmon/shared';
import { getActiveSolanaApprovalAccount } from '@salmon/shared/utils/account';
import { LoadingScreen, WalletInitErrorScreen } from '@salmon/ui';
import { LockPage } from '../../pages/lock/LockPage';
import { HomePage } from '../../pages/home/HomePage';
import {
  DAppConnectPage,
  type DAppApprovalRequest,
  type DAppConnectRequest,
  DAppTransactionApprovalPage,
  type DAppTransactionRequest,
  DAppSignMessageApprovalPage,
  DAppSignInApprovalPage,
  type DAppSignInRequest,
  type DAppSignMessageRequest,
  type DAppSignOffchainMessageRequest,
} from '../../pages/dapp';
import { SelectOptionsPage } from '../../pages/auth/SelectOptionsPage';
import { CreateWalletPage } from '../../pages/auth/CreateWalletPage';
import { RecoverWalletPage } from '../../pages/auth/RecoverWalletPage';
import { PasswordPage } from '../../pages/auth/PasswordPage';
import { SuccessPage } from '../../pages/auth/SuccessPage';
import { AnalyticsConsentPage } from '../../pages/auth/AnalyticsConsentPage';
import { DerivedAccountsPage } from '../../pages/auth/DerivedAccountsPage';
import { clearSessionKey } from '../../utils/sessionKeyCache';
import { sessionArea } from '../../utils/storageCompat';

// ============================================================================
// Types
// ============================================================================

type AuthStep =
  'select' | 'create' | 'recover' | 'password' | 'analytics-consent' | 'success' | 'derived';

interface AuthData {
  mnemonic: string;
  flowType: 'create' | 'recover';
}

// ============================================================================
// Main App
// ============================================================================

/**
 * Main App component that handles wallet state and routing.
 *
 * State machine:
 * 1. Loading (ready = false) -> Show loading spinner
 * 2. Locked (ready = true, locked = true) -> Show lock screen
 * 3. No accounts (ready = true, accounts.length = 0) -> Show auth flow
 * 4. Auth flow in progress (justCreated = true) -> Show auth flow
 * 5. Unlocked (ready = true, locked = false) -> Show home
 */
function App() {
  const [state, actions] = useAccountsContext();
  const {
    ready,
    locked,
    accounts,
    error: initError,
    activeAccount,
    activeBlockchainAccount,
    networkId,
    pathIndex,
  } = state;
  const settleAfterTx = useSettleAfterTx();
  // `useWaitGate` first: below `motionMs.waitDelay` the wait never mounts at
  // all, so a boot that resolves in 200ms shows nothing rather than a 2s wave
  // train that would make the extension feel slower than the spinner it
  // replaces. `useWaitExit` second: once it has mounted, it leaves on a wave,
  // and unmounting it the instant `ready` flips would cut the crossing.
  const showBootWait = useWaitGate(!ready);
  const { held: waitHeld, onExited: onWaitExited } = useWaitExit(showBootWait);
  const solanaApprovalAccount = useMemo(
    () => getActiveSolanaApprovalAccount(activeAccount, activeBlockchainAccount, pathIndex),
    [activeAccount, activeBlockchainAccount, pathIndex]
  );
  const solanaAddress = solanaApprovalAccount?.getReceiveAddress() ?? '';
  const solanaApprovalNetworkId = solanaApprovalAccount?.network.id ?? null;

  // Bedrock Rule, ported from web's DAppApprovalGate: a wait *inside the dApp
  // approval flow* stands on flat ground, showing nothing living through
  // itself. The extension has no /dapp/* routes — the popup knows it was
  // launched for an approval from its URL hash, before accounts are ready.
  const isDAppApprovalLaunch = useMemo(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    return Boolean(params.get('origin') && params.get('request'));
  }, []);

  // dApp connection flow (when popup is launched for connect approval)
  const [pendingDAppRequest, setPendingDAppRequest] = useState<{
    origin: string;
    request: DAppConnectRequest;
  } | null>(null);

  // dApp transaction flow (when popup is launched for tx approval)
  const [pendingDAppTxRequest, setPendingDAppTxRequest] = useState<{
    origin: string;
    request: DAppTransactionRequest;
  } | null>(null);

  // dApp sign message / sign-in flow (when popup is launched for message signing)
  const [pendingDAppSignMessageRequest, setPendingDAppSignMessageRequest] = useState<{
    origin: string;
    request: DAppSignMessageRequest | DAppSignOffchainMessageRequest | DAppSignInRequest;
  } | null>(null);

  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const origin = params.get('origin') ?? '';
    const requestStr = params.get('request');
    if (origin && requestStr) {
      try {
        const request = JSON.parse(requestStr) as DAppApprovalRequest;
        if (request.method === 'connect' && request.id != null) {
          setPendingDAppRequest({ origin, request });
        } else if (
          (request.method === 'sign' ||
            request.method === 'signOffchain' ||
            request.method === 'signIn') &&
          request.id != null
        ) {
          setPendingDAppSignMessageRequest({ origin, request });
        } else if (
          (request.method === 'signTransaction' ||
            request.method === 'signAllTransactions' ||
            request.method === 'signAndSendTransaction') &&
          request.id != null
        ) {
          setPendingDAppTxRequest({ origin, request });
        }
      } catch {
        // Ignore malformed request
      }
    }
  }, []);

  // Helper: route a single approval to the right pending state
  const routeApproval = useCallback(
    (approval: { origin: string; request: DAppApprovalRequest }) => {
      const { origin, request } = approval;
      if (request.method === 'connect' && request.id != null) {
        setPendingDAppRequest({ origin, request });
      } else if (
        (request.method === 'sign' ||
          request.method === 'signOffchain' ||
          request.method === 'signIn') &&
        request.id != null
      ) {
        setPendingDAppSignMessageRequest({ origin, request });
      } else if (
        (request.method === 'signTransaction' ||
          request.method === 'signAllTransactions' ||
          request.method === 'signAndSendTransaction') &&
        request.id != null
      ) {
        setPendingDAppTxRequest({ origin, request });
      }
    },
    []
  );

  // Listen for approval requests from background via session storage
  useEffect(() => {
    // Check for existing pending approvals on mount
    sessionArea
      .get('salmon_pending_approval')
      .then((result) => {
        const queue = result['salmon_pending_approval'] as
          | Array<{
              origin: string;
              request: DAppApprovalRequest;
            }>
          | undefined;
        if (queue && queue.length > 0) {
          routeApproval(queue[0]);
        }
      })
      .catch(() => {
        /* ignore */
      });

    // Watch for new approvals written by background.ts
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'session' && areaName !== 'local') return;
      const change = changes['salmon_pending_approval'];
      if (!change) return;
      const queue = change.newValue as
        | Array<{
            origin: string;
            request: DAppApprovalRequest;
          }>
        | undefined;
      if (queue && queue.length > 0) {
        routeApproval(queue[0]);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [routeApproval]);

  // Dismiss the current approval — clear storage entry and all pending states
  const dismissApproval = useCallback(() => {
    setPendingDAppRequest(null);
    setPendingDAppTxRequest(null);
    setPendingDAppSignMessageRequest(null);

    sessionArea
      .get('salmon_pending_approval')
      .then((result) => {
        const queue = result['salmon_pending_approval'] as unknown[] | undefined;
        if (queue && queue.length > 1) {
          // Pop the first item; the storage listener will route the next one
          const remaining = queue.slice(1);
          sessionArea.set({ salmon_pending_approval: remaining });
        } else {
          sessionArea.remove('salmon_pending_approval');
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  // After a dApp approval, settle balance + transactions for the active account/network
  // so HomePage re-fetches without a legacy refreshKey prop bridge.
  const dismissApprovalWithRefresh = useCallback(
    (approved: boolean) => {
      dismissApproval();
      if (approved && solanaAddress) {
        settleAfterTx({
          accountId: solanaAddress,
          networkId: (solanaApprovalNetworkId ?? networkId ?? undefined) as NetworkId | undefined,
          kinds: ['balance', 'transactions'],
        }).catch((err) => {
          console.warn('[App] settleAfterTx failed:', err);
        });
      }
    },
    [dismissApproval, networkId, settleAfterTx, solanaAddress, solanaApprovalNetworkId]
  );

  // Auth flow state
  const [authStep, setAuthStep] = useState<AuthStep>('select');
  const [authData, setAuthData] = useState<AuthData | null>(null);

  // First-run analytics consent — resolved on the onboarding consent step.
  const { resolveConsentPrompt } = useAnalyticsConsent();

  // Prevents premature transition to HomePage after account creation
  // (accounts.length becomes > 0 but we're still in the auth flow)
  const [justCreated, setJustCreated] = useState(false);

  // When user clicks "Add Account" from HomePage's WalletSwitcherSheet
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const closeLockTriggeredRef = useRef(false);

  // Set up inactivity timeout for auto-lock
  useInactivityTimeout({
    timeoutMs: 5 * 60 * 1000,
    onTimeout: () => {
      void clearSessionKey();
      actions.lockAccounts();
    },
    enabled: ready && !locked && accounts.length > 0 && !justCreated && !isAddingAccount,
  });

  useEffect(() => {
    if (!ready || locked || accounts.length === 0) {
      closeLockTriggeredRef.current = false;
      return;
    }

    const handleClose = () => {
      if (closeLockTriggeredRef.current) {
        return;
      }

      closeLockTriggeredRef.current = true;
      void clearSessionKey();
      void actions.lockAccounts();
    };

    window.addEventListener('pagehide', handleClose);
    window.addEventListener('beforeunload', handleClose);

    return () => {
      window.removeEventListener('pagehide', handleClose);
      window.removeEventListener('beforeunload', handleClose);
    };
  }, [actions, accounts.length, locked, ready]);

  // Handler for removing all accounts from lock screen
  const handleRemoveAllAccounts = useCallback(async () => {
    await clearSessionKey();
    await actions.removeAllAccounts();
    setAuthStep('select');
    setAuthData(null);
  }, [actions]);

  // Handler for unlocking with a cached derived key
  const handleUnlockWithCachedKey = useCallback(
    async (keyCache: DerivedKeyCache): Promise<boolean> => {
      return actions.unlockWithCachedKey(keyCache);
    },
    [actions]
  );

  // ---- Auth flow handlers ----

  const handleCreateWallet = useCallback(() => {
    setAuthStep('create');
  }, []);

  const handleRecoverWallet = useCallback(() => {
    setAuthStep('recover');
  }, []);

  const handleAuthBack = useCallback(() => {
    setAuthStep('select');
    setAuthData(null);
  }, []);

  const handleCreateComplete = useCallback((mnemonic: string) => {
    setAuthData({ mnemonic, flowType: 'create' });
    setAuthStep('password');
  }, []);

  const handleRecoverComplete = useCallback((mnemonic: string) => {
    setAuthData({ mnemonic, flowType: 'recover' });
    setAuthStep('password');
  }, []);

  const handleCreating = useCallback(() => {
    setJustCreated(true);
  }, []);

  const handlePasswordSuccess = useCallback(() => {
    setAuthStep('analytics-consent');
  }, []);

  const handleConsentResolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      setAuthStep('success');
    },
    [resolveConsentPrompt]
  );

  const handlePasswordBack = useCallback(() => {
    if (authData?.flowType === 'create') {
      setAuthStep('create');
    } else {
      setAuthStep('recover');
    }
  }, [authData]);

  const handleGoToWallet = useCallback(() => {
    setJustCreated(false);
    setIsAddingAccount(false);
    setAuthStep('select');
    setAuthData(null);
  }, []);

  const handleCheckDerived = useCallback(() => {
    setAuthStep('derived');
  }, []);

  const handleDerivedComplete = useCallback(() => {
    setJustCreated(false);
    setIsAddingAccount(false);
    setAuthStep('select');
    setAuthData(null);
  }, []);

  // "Add Account" from HomePage's WalletSwitcherSheet
  const handleAddAccountFromHome = useCallback(() => {
    setIsAddingAccount(true);
    setAuthStep('select');
    setAuthData(null);
  }, []);

  // "Access Existing Account" from SelectOptionsPage (cancel add account flow)
  const handleAccessExisting = useCallback(() => {
    setIsAddingAccount(false);
    setAuthStep('select');
    setAuthData(null);
  }, []);

  // dApp connect approval
  const handleDAppApprove = useCallback(
    async (origin: string, app?: TrustedApp) => {
      if (!solanaApprovalAccount) {
        throw new Error('Solana account not available');
      }

      await actions.addTrustedApp(origin, app, solanaApprovalAccount.network.id);
    },
    [actions, solanaApprovalAccount]
  );

  const handleDAppDeny = useCallback(() => {
    setPendingDAppRequest(null);
  }, []);

  // ---- Rendering ----

  // The extension's first frame. It used to be a bespoke CSS spinner that
  // named the ground a second time and bypassed the shared wait entirely,
  // which is why the new treatment showed on unlock but not on boot. It goes
  // through `LoadingScreen` like every other wait now — and through the same
  // gate, so a boot that resolves in 200ms still shows nothing at all rather
  // than flashing 2s of wave to say so.
  if (waitHeld) {
    return (
      <LoadingScreen
        visible={showBootWait}
        bedrock={isDAppApprovalLaunch}
        onExited={onWaitExited}
      />
    );
  }

  // Not ready, and too fast to deserve a screen. Paint nothing rather than a
  // branch chosen from state that has not finished loading.
  if (!ready) {
    return null;
  }

  // Wallet is locked — show lock screen even if account metadata failed to load.
  // This must be checked BEFORE accounts.length === 0 to prevent showing onboarding
  // when encrypted mnemonics exist but account metadata is missing from storage.
  if (locked) {
    return (
      <LockPage
        onUnlock={actions.unlockAccounts}
        onUnlockWithCachedKey={handleUnlockWithCachedKey}
        onRemoveAllAccounts={handleRemoveAllAccounts}
      />
    );
  }

  // Wallet initialization failed and nothing loaded — block instead of showing
  // onboarding: sending a user with broken storage into "create wallet" risks
  // overwriting an existing vault. Checked AFTER `locked` (lock wins) and only
  // when no accounts loaded (a secondary failure with accounts must not block).
  if (initError && accounts.length === 0 && !justCreated && !isAddingAccount) {
    return <WalletInitErrorScreen onRetry={actions.retryInit} />;
  }

  // Show auth flow when no accounts exist, just created one, or adding a new account
  if (accounts.length === 0 || justCreated || isAddingAccount) {
    switch (authStep) {
      case 'create':
        return <CreateWalletPage onComplete={handleCreateComplete} onBack={handleAuthBack} />;
      case 'recover':
        return <RecoverWalletPage onComplete={handleRecoverComplete} onBack={handleAuthBack} />;
      case 'password':
        if (!authData)
          return (
            <SelectOptionsPage
              onCreateWallet={handleCreateWallet}
              onRecoverWallet={handleRecoverWallet}
              hasAccounts={accounts.length > 0}
              onAccessExisting={handleAccessExisting}
            />
          );
        return (
          <PasswordPage
            mnemonic={authData.mnemonic}
            flowType={authData.flowType}
            onCreating={handleCreating}
            onSuccess={handlePasswordSuccess}
            onBack={handlePasswordBack}
          />
        );
      case 'analytics-consent':
        return (
          <AnalyticsConsentPage
            onAccept={() => handleConsentResolve(true)}
            onDecline={() => handleConsentResolve(false)}
          />
        );
      case 'success':
        return <SuccessPage onGoToWallet={handleGoToWallet} onCheckDerived={handleCheckDerived} />;
      case 'derived':
        return <DerivedAccountsPage onComplete={handleDerivedComplete} />;
      default:
        return (
          <SelectOptionsPage
            onCreateWallet={handleCreateWallet}
            onRecoverWallet={handleRecoverWallet}
            hasAccounts={accounts.length > 0}
            onAccessExisting={handleAccessExisting}
          />
        );
    }
  }

  // dApp connection approval (popup launched by dApp connect request)
  // dApp sign message approval
  if (pendingDAppSignMessageRequest && !locked && accounts.length > 0 && solanaApprovalAccount) {
    if (pendingDAppSignMessageRequest.request.method === 'signIn') {
      return (
        <DAppSignInApprovalPage
          origin={pendingDAppSignMessageRequest.origin}
          request={pendingDAppSignMessageRequest.request}
          account={solanaApprovalAccount}
          onDismiss={dismissApprovalWithRefresh}
        />
      );
    }
    return (
      <DAppSignMessageApprovalPage
        origin={pendingDAppSignMessageRequest.origin}
        request={pendingDAppSignMessageRequest.request}
        account={solanaApprovalAccount}
        onDismiss={dismissApprovalWithRefresh}
      />
    );
  }

  // dApp transaction approval
  if (pendingDAppTxRequest && !locked && accounts.length > 0 && solanaApprovalAccount) {
    return (
      <DAppTransactionApprovalPage
        origin={pendingDAppTxRequest.origin}
        request={pendingDAppTxRequest.request}
        account={solanaApprovalAccount}
        networkId={solanaApprovalNetworkId}
        onDismiss={dismissApprovalWithRefresh}
      />
    );
  }

  if (
    pendingDAppRequest &&
    !locked &&
    accounts.length > 0 &&
    solanaApprovalAccount &&
    solanaAddress
  ) {
    return (
      <DAppConnectPage
        origin={pendingDAppRequest.origin}
        request={pendingDAppRequest.request}
        address={solanaAddress}
        networkId={solanaApprovalNetworkId}
        onApprove={handleDAppApprove}
        onDeny={handleDAppDeny}
        onDismiss={dismissApproval}
      />
    );
  }

  // Wallet is unlocked
  return <HomePage onAddAccount={handleAddAccountFromHome} />;
}

export default App;
