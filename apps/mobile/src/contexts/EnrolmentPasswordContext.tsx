/**
 * The password, in memory, for the length of one onboarding flow.
 *
 * Arming biometrics seals the vault password, so the enrolment screen needs
 * the password the previous screen just set. The alternatives were worse: a
 * route parameter puts it in navigation state (and in anything that logs a
 * URL), and the storage stash is a persistence layer whose implementation
 * differs per platform. This is a plain React value, held by the `(auth)`
 * layout, never written anywhere, and dropped the moment the flow ends.
 *
 * It holds nothing outside the create/recover flow: the enrolment screen
 * takes it and immediately clears it, and the layout clears it on unmount.
 */

import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

interface EnrolmentPasswordValue {
  /** Parks the password for the enrolment step that follows. */
  remember: (password: string) => void;
  /**
   * Reads what is parked, without clearing it — a cancelled prompt has to be
   * retryable, and a read that consumed the password would leave the second
   * attempt with nothing to seal. The reader clears it when it is done.
   */
  read: () => string | null;
  /** Drops it. Called once the enrolment step is over, either way. */
  forget: () => void;
}

const EnrolmentPasswordContext = createContext<EnrolmentPasswordValue | null>(null);

export function EnrolmentPasswordProvider({ children }: { children: ReactNode }) {
  // A ref, not state: nothing renders from it, and a re-render for a secret is
  // one more frame in which it exists for no reason.
  const parked = useRef<string | null>(null);

  const remember = useCallback((password: string) => {
    parked.current = password;
  }, []);

  const read = useCallback(() => parked.current, []);

  const forget = useCallback(() => {
    parked.current = null;
  }, []);

  const value = useMemo(() => ({ remember, read, forget }), [remember, read, forget]);

  return (
    <EnrolmentPasswordContext.Provider value={value}>{children}</EnrolmentPasswordContext.Provider>
  );
}

/**
 * Null outside the onboarding flow — the enrolment screen is the only reader,
 * and a caller that finds nothing simply skips arming.
 */
export function useEnrolmentPassword(): EnrolmentPasswordValue | null {
  return useContext(EnrolmentPasswordContext);
}
