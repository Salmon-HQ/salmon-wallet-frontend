/**
 * The fee, asked for once the amount screen settles — one request for the
 * whole flow, on both platforms.
 *
 * The flow's context no-ops a request for a token:recipient pair it already
 * holds, so the debounce only spares the first frames of a token change; it
 * is not what keeps the request count at one. `hasAmount` is a dependency
 * because the context refuses to price an empty amount: the request has to
 * fire again the moment there is one.
 */
import { useEffect } from 'react';

import { motionMs } from '../theme/durations';

export function useDeferredFeeEstimate(estimateFee: () => void, amount: string): void {
  const hasAmount = parseFloat(amount) > 0;
  useEffect(() => {
    if (!hasAmount) return undefined;
    const timer = setTimeout(estimateFee, motionMs.feeDebounce);
    return () => clearTimeout(timer);
  }, [estimateFee, hasAmount]);
}
