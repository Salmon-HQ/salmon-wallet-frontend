/**
 * useDataAttribution — the credit owed to a network's data provider, read
 * from the backend's network catalogue (`GET /v1/networks`, promise-cached
 * for the app's lifetime). `null` while loading, when the catalogue cannot
 * be read, or when the network owes none.
 */
import { useEffect, useState } from 'react';
import { getNetworks } from '../api/services/network';
import type { DataAttribution } from '../types/blockchain';

export function useDataAttribution(networkId?: string | null): DataAttribution | null {
  const [attribution, setAttribution] = useState<DataAttribution | null>(null);

  useEffect(() => {
    if (!networkId) {
      setAttribution(null);
      return;
    }
    let cancelled = false;
    getNetworks()
      .then((networks) => {
        if (cancelled) return;
        setAttribution(networks.find((network) => network.id === networkId)?.attribution ?? null);
      })
      .catch(() => {
        // The catalogue failing is reported where it is loaded; the credit
        // simply stays absent here.
        if (!cancelled) setAttribution(null);
      });
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  return attribution;
}
