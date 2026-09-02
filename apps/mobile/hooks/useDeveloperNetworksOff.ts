import { useEffect } from 'react';

/**
 * Developer Networks is switched off (owner, 2026-09-02) and its Settings row
 * is gone, so a `true` left in storage by an earlier build would show devnet
 * with no way to turn it back off. This heals it once: whenever the stored
 * flag reads `true`, it is flipped back and persisted, so the flag reads
 * `false` for everyone until the feature returns. The config field and the
 * toggle stay — the hook is the only thing to delete when it does.
 */
export function useDeveloperNetworksOff(
  developerNetworks: boolean,
  toggleDeveloperNetworks: () => Promise<void>
): void {
  useEffect(() => {
    if (developerNetworks) {
      void toggleDeveloperNetworks();
    }
  }, [developerNetworks, toggleDeveloperNetworks]);
}

export default useDeveloperNetworksOff;
