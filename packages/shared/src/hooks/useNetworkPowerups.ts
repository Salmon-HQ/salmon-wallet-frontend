/**
 * useNetworkPowerups — the Powerups the backend offers on one network, read
 * from the network catalogue (`/v1/networks`, spec 029 §5.2).
 *
 * Fail closed: until the catalogue has answered, and whenever it cannot, the
 * allowlist is empty and Home offers no Powerup. The catalogue is fetched
 * once per session (`getNetworks` caches the promise) and its last answer is
 * kept here, so a Home that mounts after the app's own network load reads the
 * allowlist synchronously and its tabs never flash.
 *
 * This is core, not a Powerup: it carries no Powerup's copy, so both Homes
 * may import it by value in a build with Powerups off — it simply has
 * nothing to allow there.
 */
import { useEffect, useState } from 'react';
import { getNetworks } from '../api/services/network';
import type { NetworkCatalogEntry } from '../types/blockchain';
import {
  EMPTY_POWERUP_ALLOWLIST,
  parsePowerupSwitches,
  toPowerupAllowlist,
  type PowerupAllowlist,
} from '../utils/powerupSwitches';

let lastNetworks: readonly NetworkCatalogEntry[] | null = null;

function allowlistFor(
  networks: readonly NetworkCatalogEntry[] | null,
  networkId: string | null
): PowerupAllowlist {
  if (!networks || !networkId) return EMPTY_POWERUP_ALLOWLIST;
  const network = networks.find((entry) => entry.id === networkId);
  if (!network) return EMPTY_POWERUP_ALLOWLIST;
  return toPowerupAllowlist(parsePowerupSwitches((network as { powerups?: unknown }).powerups));
}

export function useNetworkPowerups(networkId: string | null): PowerupAllowlist {
  const [networks, setNetworks] = useState<readonly NetworkCatalogEntry[] | null>(lastNetworks);

  useEffect(() => {
    let cancelled = false;
    getNetworks()
      .then((result) => {
        lastNetworks = result;
        if (!cancelled) setNetworks(result);
      })
      .catch(() => {
        // Closed stays closed; the catalogue failing is reported where the
        // app loads it.
        if (!cancelled) setNetworks(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return allowlistFor(networks, networkId);
}

/** Test seam: forget the last catalogue answer. */
export function resetNetworkPowerupsCache(): void {
  lastNetworks = null;
}
