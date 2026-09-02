import { useEffect, useRef } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import { ensureMirrorNetworks } from '../utils/derived-accounts';
import { MIRROR_NETWORK_IDS } from '../utils/network';

/**
 * Completes an existing wallet's mirror (devnet / testnet / sepolia) addresses
 * the first time Developer Networks asks for them — on every platform.
 *
 * Wallets created before mirrors were derived at creation hold only the
 * mainnet half, so the offer would list a network the wallet has no address
 * for and the carousel would drop the page silently (spec 026 D2). The seed is
 * the one already in memory on the unlocked account — never logged, never
 * re-read from storage — and the derived accounts are persisted through
 * `editAccount`, the same door the derived-accounts scan uses.
 *
 * Watch-only and private-key wallets have no derivation tree; `ensureMirrorNetworks`
 * returns nothing for them and nothing is written.
 */
export function useEnsureMirrorNetworks(enabled: boolean): void {
  const [accountState, accountActions] = useAccountsContext();
  const { ready, locked, activeAccount } = accountState;
  // One attempt per wallet per session: a failure that repeats every render
  // would re-derive on every keystroke elsewhere in the app.
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !ready || locked || !activeAccount) return;

    const networksAccounts = activeAccount.networksAccounts ?? {};
    const missing = Object.keys(networksAccounts)
      .map((held) => MIRROR_NETWORK_IDS[held])
      .filter((mirror) => !!mirror && !networksAccounts[mirror]?.some(Boolean));
    if (missing.length === 0) return;
    if (attemptedRef.current === activeAccount.id) return;
    attemptedRef.current = activeAccount.id;

    // Locking mid-derivation drops the result on the floor rather than writing
    // it after the vault closed.
    let cancelled = false;
    void (async () => {
      try {
        const derived = await ensureMirrorNetworks(activeAccount, missing);
        if (cancelled || derived.length === 0) return;
        await accountActions.editAccount(activeAccount.id, { newDerivedAccounts: derived });
      } catch (error) {
        console.warn('[mirror-networks] derivation failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, ready, locked, activeAccount, accountActions]);
}
