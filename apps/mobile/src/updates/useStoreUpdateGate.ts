/**
 * The store update gate, at launch.
 *
 * `useMandatoryUpdate` applies JavaScript updates, but an update only reaches
 * binaries built from the same version string. When a release has to be a
 * new binary — a native module, a new SDK — the people on the old one keep
 * opening a build the team no longer supports. This gate closes that door:
 * at launch the app reads the minimum version the team publishes for the
 * platform and, when the installed version is older, shows the update screen
 * with a link to the store instead of the wallet.
 *
 * The same three rules as the update gate, because this is a wallet:
 *
 * - **Fail open.** No network, a slow server, a file that does not parse:
 *   the app opens on the build it has. Only a file that is read in full and
 *   names a newer minimum closes it.
 * - **Bounded.** The fetch is capped at {@link UPDATE_GATE_TIMEOUT_MS}.
 * - **Never in development.** A dev build carries whatever version app.json
 *   says and must open regardless.
 *
 * The store links the screen opens are constants here, never read from the
 * file — see `storeRelease.ts` in packages/shared for why.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { isUpdateRequired, type StorePlatform } from '@salmon/shared';

import { UPDATE_GATE_TIMEOUT_MS, withTimeout } from './useMandatoryUpdate';

/** The team's published minimum, one entry per platform. */
export const STORE_RELEASE_URL = 'https://salmonwallet.io/app/mobile-release.json';

/** Where the update button sends the user; fixed in the binary on purpose. */
export const STORE_URLS: Record<StorePlatform, string> = {
  ios: 'https://apps.apple.com/app/salmon-open-wallet/id6799740991',
  android: 'https://play.google.com/store/apps/details?id=io.salmonwallet.app',
};

export interface StoreUpdateGate {
  /** `true` while the gate is still deciding. Render the splash then. */
  checking: boolean;
  /** `true` once the published minimum is known to be newer than this build. */
  required: boolean;
}

/** The platform this build was made for; `null` where no store exists. */
function storePlatform(): StorePlatform | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

/** Fetches and parses the published file; `null` on any failure. */
async function readPublishedFile(signal: AbortSignal): Promise<unknown> {
  const response = await fetch(STORE_RELEASE_URL, { signal, cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

export function useStoreUpdateGate(): StoreUpdateGate {
  const enabled = !__DEV__ && storePlatform() !== null;
  const [checking, setChecking] = useState(enabled);
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const file = await withTimeout(
          readPublishedFile(controller.signal),
          UPDATE_GATE_TIMEOUT_MS
        );
        if (cancelled || file === null) return;
        const platform = storePlatform();
        if (platform && isUpdateRequired(Constants.expoConfig?.version, file, platform)) {
          setRequired(true);
        }
      } catch (error) {
        // Deliberately swallowed: a minimum the app could not read is not a
        // reason to keep someone out of their own wallet.
        console.warn('[updates] store minimum check failed, opening the installed build:', error);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return { checking, required };
}
