import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAccountsContext } from '@salmon/shared';

import { useBiometric } from '../src/contexts/BiometricContext';

/**
 * The lock screen's reset: biometrics disarmed, every wallet erased, then the
 * welcome screen. It rejects when a step fails, so the sheet that ran it can
 * say so.
 */
export function useResetSalmon(): () => Promise<void> {
  const router = useRouter();
  const [, accountActions] = useAccountsContext();
  const { disarm } = useBiometric();
  return useCallback(async () => {
    await disarm();
    await accountActions.removeAllAccounts();
    router.replace('/(auth)');
  }, [accountActions, disarm, router]);
}
