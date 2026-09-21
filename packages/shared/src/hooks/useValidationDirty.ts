/**
 * The "judged for the current text" bit next to `useAddressValidation`.
 *
 * The validator holds its verdict across an edit: for the debounce window it
 * still reports the PREVIOUS string's `isValid` with `isValidating` false, so
 * a freshly typed address reads as approved. `dirty` is set on every
 * keystroke and cleared only when a validation cycle actually completes —
 * the hook aborts superseded cycles without ever settling them, so only the
 * last one clears it.
 *
 * Every recipient screen gates Continue on `!dirty`: the DOM `StepRecipient`,
 * the mobile token send and the mobile NFT send. The claim is written here
 * because a screen that forgets it looks correct in isolation — the mobile
 * token send did, and paste-then-Continue inside the debounce carried a
 * never-validated address to the signer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useValidationDirty(isValidating: boolean): {
  dirty: boolean;
  markDirty: () => void;
} {
  const [dirty, setDirty] = useState(false);
  const wasValidating = useRef(false);
  useEffect(() => {
    if (wasValidating.current && !isValidating) setDirty(false);
    wasValidating.current = isValidating;
  }, [isValidating]);
  const markDirty = useCallback(() => setDirty(true), []);
  return { dirty, markDirty };
}
