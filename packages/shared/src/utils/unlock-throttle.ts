/**
 * Unlock throttling — the online cost of guessing the password.
 *
 * PBKDF2 (210k iterations) prices an *offline* guess against the vault file.
 * It prices nothing at the prompt: whoever holds an unlocked-but-locked device
 * can retype passwords as fast as the UI accepts them, and each try costs them
 * only the derivation they were going to pay anyway. This module adds the
 * missing cost — a growing delay after repeated failures.
 *
 * Deliberately NOT here: any destructive response. Too many wrong guesses
 * makes the wallet slow to open, never gone. A wipe would turn a forgetful
 * owner into a robbery victim.
 *
 * Clock handling: the penalty deadline is measured two ways and the *longer*
 * remainder wins.
 *
 * - Wall clock (`Date.now`) is the only thing that survives a restart, so it
 *   carries the penalty across process death. A user who moves the device
 *   clock forward can skip the current wait — but not the counter, which is
 *   persisted and only ever grows until a correct password arrives. Skipping
 *   the wait therefore buys one guess at the *next*, longer delay.
 * - A monotonic reading (`performance.now`, unaffected by clock changes)
 *   guards the running process, so changing the clock mid-attack does nothing.
 */

import { getStorageItem, removeStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';

/** Attempts allowed before any delay — fat-fingering a long password is normal. */
export const UNLOCK_FREE_ATTEMPTS = 3;

/** Delay after each failure past the free ones; the last value repeats. */
export const UNLOCK_DELAY_SCHEDULE_MS = [5_000, 15_000, 30_000, 60_000, 300_000] as const;

interface UnlockAttemptRecord {
  failedAttempts: number;
  /** Wall-clock time of the most recent failure. */
  lastFailedAt: number;
}

export interface UnlockPenalty {
  failedAttempts: number;
  /** Milliseconds the user must wait before the next attempt is accepted. */
  remainingMs: number;
}

const NO_PENALTY: UnlockPenalty = { failedAttempts: 0, remainingMs: 0 };

/**
 * Monotonic deadline for the current process. Cleared on success, ignored
 * across restarts (a new process has a new time origin).
 */
let monotonicDeadline: number | null = null;

function monotonicNow(): number | null {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : null;
}

/** How long the user waits after `failedAttempts` consecutive failures. */
export function unlockDelayMs(failedAttempts: number): number {
  const overshoot = failedAttempts - UNLOCK_FREE_ATTEMPTS;
  if (overshoot <= 0) return 0;

  const index = Math.min(overshoot - 1, UNLOCK_DELAY_SCHEDULE_MS.length - 1);
  return UNLOCK_DELAY_SCHEDULE_MS[index];
}

function isRecord(value: unknown): value is UnlockAttemptRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UnlockAttemptRecord).failedAttempts === 'number' &&
    typeof (value as UnlockAttemptRecord).lastFailedAt === 'number'
  );
}

async function readRecord(): Promise<UnlockAttemptRecord | null> {
  const stored = await getStorageItem<unknown>(STORAGE_KEYS.UNLOCK_ATTEMPTS);
  return isRecord(stored) ? stored : null;
}

/** Current penalty, if any. Safe to call on every render tick. */
export async function getUnlockPenalty(): Promise<UnlockPenalty> {
  const record = await readRecord();
  if (!record) return NO_PENALTY;

  const delay = unlockDelayMs(record.failedAttempts);
  const elapsed = Date.now() - record.lastFailedAt;
  // A negative elapsed means the clock moved backwards: charge the full delay
  // rather than trusting the new reading.
  const wallRemaining = elapsed < 0 ? delay : delay - elapsed;

  const mono = monotonicNow();
  const monoRemaining = mono !== null && monotonicDeadline !== null ? monotonicDeadline - mono : 0;

  return {
    failedAttempts: record.failedAttempts,
    remainingMs: Math.max(0, wallRemaining, monoRemaining),
  };
}

/** Record one wrong password and return the penalty it just earned. */
export async function recordFailedUnlock(): Promise<UnlockPenalty> {
  const record = await readRecord();
  const failedAttempts = (record?.failedAttempts ?? 0) + 1;

  await setStorageItem<UnlockAttemptRecord>(STORAGE_KEYS.UNLOCK_ATTEMPTS, {
    failedAttempts,
    lastFailedAt: Date.now(),
  });

  const delay = unlockDelayMs(failedAttempts);
  const mono = monotonicNow();
  monotonicDeadline = mono !== null && delay > 0 ? mono + delay : null;

  return { failedAttempts, remainingMs: delay };
}

/** Forget the failures. Called only when a correct password arrives. */
export async function clearUnlockPenalty(): Promise<void> {
  monotonicDeadline = null;
  await removeStorageItem(STORAGE_KEYS.UNLOCK_ATTEMPTS);
}
