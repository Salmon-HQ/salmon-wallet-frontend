/**
 * useRecipientWarning — the warning a send's review shows about a destination
 * with no private key behind it.
 *
 * An off-curve address has no private key: funds sent there come out only if
 * a program lets them. The recipient screen judges typed text, and a scanned
 * or pasted payment request skips that screen, so the review judges the
 * destination it is about to pay, whichever way it arrived. A warning, not a
 * block: some program accounts are meant to receive funds.
 *
 * Being off the curve is a property of the address, read without the
 * network, so the warning never depends on a lookup. The account's own
 * validation only picks the wording (whether the account holds funds); when
 * it fails the neutral wording stays.
 *
 * @module hooks/useRecipientWarning
 */
import { useEffect, useState } from 'react';
import { isAddress, isOffCurveAddress } from '@solana/addresses';
import type { BlockchainAccount } from '../types/blockchain';
import { VALIDATION_MESSAGES } from '../utils/validation';

/** Says what the address is, nothing about its funds. */
const NEUTRAL = VALIDATION_MESSAGES.off_curve_has_funds as string;

/** Translation key of the warning about `destination`, or null. */
export function useRecipientWarning(
  account: BlockchainAccount | undefined,
  destination: string | null
): string | null {
  const offCurve = !!destination && isAddress(destination) && isOffCurveAddress(destination);
  const [wording, setWording] = useState<{ address: string; key: string } | null>(null);

  useEffect(() => {
    if (!account || !destination || !offCurve) return undefined;
    let current = true;
    void (async () => {
      try {
        const { code } = await account.validateDestinationAccount(destination);
        const key = code.startsWith('off_curve') ? VALIDATION_MESSAGES[code] : undefined;
        if (current && key) setWording({ address: destination, key });
      } catch {
        // The neutral wording stays.
      }
    })();
    return () => {
      current = false;
    };
  }, [account, destination, offCurve]);

  if (!offCurve) return null;
  return wording && wording.address === destination ? wording.key : NEUTRAL;
}
