/**
 * useRecipientWarning — the warning a send's review shows about a destination
 * with no private key behind it.
 *
 * An off-curve address has no private key: funds sent there come out only if
 * a program lets them. The recipient screen judges typed text, and a scanned
 * or pasted payment request skips that screen, so the review judges the
 * destination it is about to pay, whichever way it arrived. A warning, not a
 * block: some program accounts are meant to receive funds. No verdict (a
 * network failure) shows nothing.
 *
 * @module hooks/useRecipientWarning
 */
import { useEffect, useState } from 'react';
import type { BlockchainAccount } from '../types/blockchain';
import { VALIDATION_MESSAGES } from '../utils/validation';

/** Validator codes for an address with no private key behind it. */
const OFF_CURVE_CODES = new Set(['off_curve_no_funds', 'off_curve_has_funds']);

/** Translation key of the warning about `destination`, or null. */
export function useRecipientWarning(
  account: BlockchainAccount | undefined,
  destination: string | null
): string | null {
  const [verdict, setVerdict] = useState<{ address: string; key: string | null } | null>(null);

  useEffect(() => {
    if (!account || !destination) return undefined;
    let current = true;
    void (async () => {
      try {
        const { code } = await account.validateDestinationAccount(destination);
        if (current) {
          setVerdict({
            address: destination,
            key: OFF_CURVE_CODES.has(code) ? (VALIDATION_MESSAGES[code] ?? null) : null,
          });
        }
      } catch {
        // No verdict, no warning.
      }
    })();
    return () => {
      current = false;
    };
  }, [account, destination]);

  return verdict && verdict.address === destination ? verdict.key : null;
}
