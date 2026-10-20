/**
 * useNetworkPowerups — the Powerups the backend offers THIS caller on one
 * network, read from the availability route (spec 018: decided per request
 * from the caller's country and platform, never cached at the edge).
 *
 * Fail closed: until the route has answered, and whenever it cannot, the
 * allowlist is empty and Home offers no Powerup. The last answer per network
 * is kept for the session, so a Home that mounts again reads it
 * synchronously and its tabs never flash; every mount still asks again, and
 * so does every return to the foreground, because the answer is the caller's
 * and changes with where they are: a wallet that travelled in the background
 * must show a blocked Powerup's reason the moment its tab opens.
 *
 * This is core, not a Powerup: it carries no Powerup's copy, so both Homes
 * may import it by value in a build with Powerups off — it simply has
 * nothing to allow there.
 */
import { useEffect, useState } from 'react';
import { focusManager } from '@tanstack/react-query';
import { getPowerupAvailability } from '../api/services/powerups';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import {
  EMPTY_POWERUP_ALLOWLIST,
  parsePowerupSwitches,
  toPowerupAllowlist,
  type PowerupAllowlist,
} from '../utils/powerupSwitches';

const lastByNetwork = new Map<string, PowerupAllowlist>();
/** One question per network at a time: Homes that mount together share it. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * `fresh` skips the shared question: a return to the foreground must ask from
 * where the wallet is now, not join one sent before it moved.
 */
function askOnce(networkId: string, fresh: boolean): Promise<unknown> {
  const shared = fresh ? undefined : inFlight.get(networkId);
  if (shared) return shared;
  const pending: Promise<unknown> = getPowerupAvailability(networkId).finally(() => {
    if (inFlight.get(networkId) === pending) inFlight.delete(networkId);
  });
  inFlight.set(networkId, pending);
  return pending;
}

export function useNetworkPowerups(networkId: string | null): PowerupAllowlist {
  const [allowlist, setAllowlist] = useState<PowerupAllowlist>(
    () => (networkId && lastByNetwork.get(networkId)) || EMPTY_POWERUP_ALLOWLIST
  );

  useEffect(() => {
    // Powerups exist only on Solana, and so does the route: asking for any
    // other network is a guaranteed 404.
    if (!networkId || getBlockchainFromNetworkId(networkId) !== 'solana') {
      setAllowlist(EMPTY_POWERUP_ALLOWLIST);
      return;
    }
    let cancelled = false;
    // Only the newest question may write: an older one that answers late
    // describes where the wallet was.
    let latest = 0;
    const ask = (keepOnFailure: boolean, fresh: boolean) => {
      const asked = ++latest;
      return askOnce(networkId, fresh)
        .then((entries) => {
          if (asked !== latest) return;
          const next = toPowerupAllowlist(parsePowerupSwitches(entries));
          lastByNetwork.set(networkId, next);
          if (!cancelled) setAllowlist(next);
        })
        .catch(() => {
          // A re-ask on return to the foreground often fails before the
          // network is back; it keeps the last answer, since the backend
          // refuses a blocked build anyway. Otherwise closed stays closed.
          if (asked !== latest || keepOnFailure) return;
          lastByNetwork.delete(networkId);
          if (!cancelled) setAllowlist(EMPTY_POWERUP_ALLOWLIST);
        });
    };
    setAllowlist(lastByNetwork.get(networkId) ?? EMPTY_POWERUP_ALLOWLIST);
    void ask(false, false);
    const unsubscribe = focusManager.subscribe((focused) => {
      if (focused) void ask(true, true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [networkId]);

  return allowlist;
}

/** Test seam: forget every network's last answer. */
export function resetNetworkPowerupsCache(): void {
  lastByNetwork.clear();
  inFlight.clear();
}
