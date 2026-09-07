/**
 * Mandatory updates, at launch.
 *
 * `expo-updates` on its own is not mandatory: its default is to fetch in the
 * background and apply on the *next* launch, so a user who never fully quits
 * the app can stay on a broken build indefinitely. This makes the update a
 * gate — check, fetch, reload, and only then show the app — which is as close
 * to a forced update as either store allows for a JS-only change.
 *
 * Three rules it will not break, because this is a wallet:
 *
 * - **Fail open.** Any error, and the app opens on the build it has. Nobody is
 *   locked out of their funds because an update server was unreachable.
 * - **Bounded.** The whole check is capped; a slow network delays the launch
 *   by at most {@link UPDATE_GATE_TIMEOUT_MS}, never indefinitely.
 * - **Never in development.** `Updates.isEnabled` is false in dev clients and
 *   Expo Go, so the gate is a no-op there.
 *
 * What this cannot do: ship native code. `runtimeVersion.policy` is
 * `appVersion`, so an update only ever reaches binaries built from the same
 * version string — see `apps/mobile/AGENTS.md`.
 */

import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

/**
 * How long the launch may wait on the update server.
 *
 * Long enough for a check plus a small bundle on a mediocre connection, short
 * enough that a dead server is a pause rather than an outage.
 */
export const UPDATE_GATE_TIMEOUT_MS = 8000;

/** Resolves to `null` if `promise` has not settled in time. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    // Cleared on the winning path too — a live timer per check is a handle
    // that outlives the thing it was guarding.
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * @returns `true` while the gate is still deciding. Render the splash then;
 * render the app the moment it turns false.
 */
export function useMandatoryUpdate(): boolean {
  const [checking, setChecking] = useState(() => Updates.isEnabled);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    let cancelled = false;

    const run = async () => {
      try {
        const check = await withTimeout(Updates.checkForUpdateAsync(), UPDATE_GATE_TIMEOUT_MS);
        if (cancelled || !check?.isAvailable) return;

        const fetched = await withTimeout(Updates.fetchUpdateAsync(), UPDATE_GATE_TIMEOUT_MS);
        if (cancelled || !fetched?.isNew) return;

        // Reloads into the new bundle. Nothing after this line runs.
        await Updates.reloadAsync();
      } catch (error) {
        // Deliberately swallowed. An update the app could not fetch is not a
        // reason to keep someone out of their own wallet.
        console.warn('[updates] update check failed, continuing on the installed build:', error);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return checking;
}
