/**
 * Powerups availability service — what this caller may use on one network,
 * decided by the backend per request from the caller's country and the
 * `X-Salmon-Platform` header (spec 018, `capability-availability` contract).
 *
 * Endpoint: GET /v1/{networkId}/powerups/availability — never cached, by
 * the backend (`Cache-Control: no-store`) and by this module: the answer is
 * the caller's, so each mount asks again.
 */
import { apiClient } from '../client';

/** One entry as the backend sends it, before the client's fail-closed parse. */
export interface PowerupAvailabilityEntry {
  id: string;
  enabled: boolean;
  reason?: string;
  /** The routing provider the row chose, when the capability has one. */
  provider?: string;
}

export async function getPowerupAvailability(networkId: string): Promise<unknown> {
  const { data } = await apiClient.get<{ data?: unknown }>(
    `/v1/${encodeURIComponent(networkId)}/powerups/availability`
  );
  return data?.data;
}
