/**
 * What a platform's confirmation host renders from: the parked proposal, the
 * seconds its quote has left, and the three controls. The countdown and the
 * "expired → rebuild before signing" rule live here once, so both twins
 * behave the same.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import { useSignatureRequestContext } from './SignatureRequestContext';
import type { PendingSignatureRequest } from './SignatureRequestContext';

export interface SignatureRequestHost {
  request: PendingSignatureRequest | null;
  /** Whole seconds until `expiresAt`; `null` when the proposal never expires. */
  secondsLeft: number | null;
  /** True while a refreshed proposal is being built. */
  refreshing: boolean;
  /** The confirm control's label: "Confirm (12)" or "Refresh Quote" once expired. */
  confirmLabel: string;
  /** Confirm, or rebuild first when the quote expired. */
  confirmOrRefresh: () => Promise<void>;
  cancel: () => void;
}

function secondsUntil(expiresAt: string | undefined, now: number): number | null {
  if (!expiresAt) return null;
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

export function useSignatureRequestHost(): SignatureRequestHost {
  const { pending, confirm, cancel, refresh } = useSignatureRequestContext();
  const expiresAt = pending?.proposal.expiresAt;
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!expiresAt) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const secondsLeft = useMemo(() => secondsUntil(expiresAt, now), [expiresAt, now]);
  const expired = secondsLeft === 0;

  const confirmOrRefresh = useCallback(async () => {
    if (!pending) return;
    if (expired && pending.proposal.refresh) {
      setRefreshing(true);
      try {
        await refresh();
      } finally {
        setRefreshing(false);
      }
      return;
    }
    await confirm();
  }, [pending, expired, refresh, confirm]);

  const confirmLabel = useMemo(() => {
    if (expired) return i18n.t('confirmation.refreshQuote', { defaultValue: 'Refresh Quote' });
    if (secondsLeft === null) return i18n.t('confirmation.confirm', { defaultValue: 'Confirm' });
    return i18n.t('confirmation.confirmCountdown', {
      seconds: secondsLeft,
      defaultValue: 'Confirm ({{seconds}})',
    });
  }, [expired, secondsLeft]);

  return { request: pending, secondsLeft, refreshing, confirmLabel, confirmOrRefresh, cancel };
}
