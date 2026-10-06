/**
 * useNetworkPowerups — the Powerups the backend offers THIS caller on one
 * network, read from the availability route (spec 018: decided per request
 * from the caller's country and platform, never cached at the edge).
 *
 * Fail closed: until the route has answered, and whenever it cannot, the
 * allowlist is empty and Home offers no Powerup. The last answer per network
 * is kept for the session, so a Home that mounts again reads it
 * synchronously and its tabs never flash; every mount still asks again,
 * because the answer is the caller's and may change with their network.
 *
 * This is core, not a Powerup: it carries no Powerup's copy, so both Homes
 * may import it by value in a build with Powerups off — it simply has
 * nothing to allow there.
 */
import { useEffect, useState } from 'react';
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

function askOnce(networkId: string): Promise<unknown> {
  let pending = inFlight.get(networkId);
  if (!pending) {
    pending = getPowerupAvailability(networkId).finally(() => inFlight.delete(networkId));
    inFlight.set(networkId, pending);
  }
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
    setAllowlist(lastByNetwork.get(networkId) ?? EMPTY_POWERUP_ALLOWLIST);
    askOnce(networkId)
      .then((entries) => {
        const next = toPowerupAllowlist(parsePowerupSwitches(entries));
        lastByNetwork.set(networkId, next);
        if (!cancelled) setAllowlist(next);
      })
      .catch(() => {
        // Closed stays closed; a route that cannot answer offers nothing.
        lastByNetwork.delete(networkId);
        if (!cancelled) setAllowlist(EMPTY_POWERUP_ALLOWLIST);
      });
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  return allowlist;
}

/** Test seam: forget every network's last answer. */
export function resetNetworkPowerupsCache(): void {
  lastByNetwork.clear();
  inFlight.clear();
}
