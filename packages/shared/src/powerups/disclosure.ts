/**
 * The disclosure the catalogue shows before install (spec 029 §2.1, §4):
 * one line per thing that leaves the device and where it goes, generated
 * from the manifest's `permissions` and `endpoints`. Never written per
 * Powerup, so it cannot drift from what the folder declares; identical for a
 * core and a community Powerup with the same declarations.
 */
import type { PowerupManifest } from './manifest';

/** A translation key and the params it interpolates, resolved at render. */
export interface PowerupDisclosureLine {
  key: string;
  params?: Record<string, string>;
}

const PERMISSION_KEY: Record<'address' | 'balances', string> = {
  address: 'powerups.disclosure.address_to',
  balances: 'powerups.disclosure.balances_to',
};

/** `https://api.example.com/v2` → `api.example.com`; an odd value is shown as it is. */
function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

export function describeDisclosure(
  manifest: Pick<PowerupManifest, 'permissions' | 'endpoints'>
): PowerupDisclosureLine[] {
  const shared = manifest.permissions.filter(
    (permission): permission is 'address' | 'balances' => permission !== 'none'
  );
  if (shared.length === 0) return [{ key: 'powerups.disclosure.sends_nothing' }];

  // No endpoint of its own means the data goes to the Salmon backend only.
  const hosts = manifest.endpoints.length > 0 ? manifest.endpoints.map(hostOf) : ['Salmon'];
  return shared.flatMap((permission) =>
    hosts.map((host) => ({ key: PERMISSION_KEY[permission], params: { host } }))
  );
}
