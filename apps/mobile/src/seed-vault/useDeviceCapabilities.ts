import { useEffect, useState } from 'react';
import type { DeviceCapability } from '@salmon/shared';

import { isSeedVaultAvailable } from './bridge';

const NONE: readonly DeviceCapability[] = [];
// The device does not change under the app: asked once per session.
let known: readonly DeviceCapability[] | undefined;
let asking: Promise<readonly DeviceCapability[]> | undefined;

/** The same single answer the hook uses; analytics reads it to tell a Seeker apart (spec 042). */
export function loadDeviceCapabilities(): Promise<readonly DeviceCapability[]> {
  asking ??= isSeedVaultAvailable().then((yes) => {
    known = yes ? ['seed-vault'] : NONE;
    return known;
  });
  return asking;
}

/**
 * What this device offers a Powerup that needs more than a network (spec
 * 040). Empty until Seed Vault has answered, so a Powerup that needs it
 * appears a moment later rather than flashing in and out.
 */
export function useDeviceCapabilities(): readonly DeviceCapability[] {
  const [capabilities, setCapabilities] = useState(known ?? NONE);
  useEffect(() => {
    if (known) return;
    let live = true;
    void loadDeviceCapabilities().then((answer) => live && setCapabilities(answer));
    return () => {
      live = false;
    };
  }, []);
  return capabilities;
}

/** Test seam: forget the answer. */
export function resetDeviceCapabilities(): void {
  known = undefined;
  asking = undefined;
}
