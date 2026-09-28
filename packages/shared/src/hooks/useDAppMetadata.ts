import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/keys';
import { getAnalytics } from '../analytics/client';
import { getDappMetadata } from '../api/services';
import type { DappMetadata } from '../types/trusted-app';

export interface UseDAppMetadataResult {
  metadata: DappMetadata | null;
  loading: boolean;
}

/**
 * The name and icon a site is shown under, when the user allowed the lookup.
 *
 * Asking for them sends the origin to salmon-api in a query parameter, one
 * request per site the user interacts with — which is the user's browsing
 * history, arriving beside requests that carry their wallet address. That is
 * the thing the analytics consent is about, so it is the same answer that
 * decides here. A decline is not a broken screen: the approval row falls back
 * to the origin and the globe, which is what it already shows for a site that
 * has no metadata.
 */
export function useDAppMetadata(origin: string): UseDAppMetadataResult {
  const isEnabled = !!origin && getAnalytics()?.getConsent() === true;
  const query = useQuery({
    queryKey: origin ? queryKeys.dappMetadata({ origin }) : ['dapp-metadata', 'disabled'],
    queryFn: async () => {
      try {
        return await getDappMetadata(origin);
      } catch {
        return null;
      }
    },
    enabled: isEnabled,
    staleTime: 5 * 60_000,
  });

  return {
    metadata: query.data ?? null,
    loading: isEnabled && query.isPending,
  };
}
