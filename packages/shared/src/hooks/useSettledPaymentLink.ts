/**
 * useSettledPaymentLink — read a `solana:` payment link once it stops changing.
 *
 * The recipient field takes a pasted payment link as well as an address. Text
 * does not always arrive whole: a hardware keyboard, the simulator, an
 * accessibility tool or a person typing all deliver it a character at a time.
 * Reading the link on every change acted on whatever prefix had arrived — a
 * request for `amount=1` on the way to `amount=10`, a request without the memo
 * that comes after it.
 *
 * So the link is read only after the text has been still for `delayMs`. Plain
 * addresses are not this hook's business; the address validator judges them
 * with its own debounce.
 *
 * @module hooks/useSettledPaymentLink
 */

import { useEffect, useRef } from 'react';

/** Long enough to outlast keystroke-by-keystroke delivery, short enough to feel immediate. */
export const PAYMENT_LINK_SETTLE_MS = 400;

/**
 * Calls `onSettled` with the trimmed text once a `solana:` link has stopped
 * changing for `delayMs`. Any further change cancels the pending call.
 */
export function useSettledPaymentLink(
  text: string,
  onSettled: (link: string) => void,
  delayMs: number = PAYMENT_LINK_SETTLE_MS
): void {
  // Read through a ref: the timer is armed by the text, never by a re-created
  // callback, or every render would restart the wait.
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    const trimmed = text.trim();
    if (!/^solana:/i.test(trimmed)) return undefined;

    const timer = setTimeout(() => onSettledRef.current(trimmed), delayMs);
    return () => clearTimeout(timer);
  }, [text, delayMs]);
}
