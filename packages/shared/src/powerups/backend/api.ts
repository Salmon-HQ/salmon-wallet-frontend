/**
 * The one backend call a transaction-building Powerup makes (spec 029 §5.1):
 * GET /v1/{networkId}/powerups/{id}/build with the Powerup's own query
 * parameters. Errors are thrown as the client's `ApiError` unchanged — the
 * code is what the screen renders from, so nothing here may swallow it.
 */
import { apiClient } from '../../api/client';
import type { PowerupBuildEnvelope } from './types';

export async function buildPowerup<T extends PowerupBuildEnvelope = PowerupBuildEnvelope>(
  id: string,
  networkId: string,
  params: Record<string, string | number>
): Promise<T> {
  const { data } = await apiClient.get<T>(`/v1/${networkId}/powerups/${id}/build`, { params });
  return data;
}

export type BuildPowerupFn = typeof buildPowerup;
