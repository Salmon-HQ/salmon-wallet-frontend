/**
 * Backend reachability helper for live integration tests.
 *
 * Tests that consume `getReachableBackendBaseUrl` are dev-machine smoke tests
 * by design: they run when a local salmon-api is reachable on one of the
 * candidate URLs and silently skip otherwise. CI does NOT spin up the backend
 * — that gap is intentional. Schema drift is caught the next time a developer
 * runs the suite locally against a live backend.
 *
 * To force these tests to run, set EXPO_PUBLIC_API_URL / VITE_API_URL /
 * API_URL (or HOST + PORT) so the candidate list points at a reachable
 * backend.
 */
const DEFAULT_LOCAL_HOST = 'localhost';
const DEFAULT_RETRY_DELAY_MS = 250;

export function getBackendBaseUrlCandidates(): string[] {
  const envApiUrl =
    process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL || process.env.API_URL;
  const envHost =
    process.env.EXPO_PUBLIC_API_HOST || process.env.VITE_API_HOST || DEFAULT_LOCAL_HOST;
  const envPort = process.env.EXPO_PUBLIC_API_PORT || process.env.VITE_API_PORT;
  const candidates = [
    envApiUrl,
    envPort ? `http://${envHost}:${envPort}/local` : undefined,
    'http://127.0.0.1:3001/local',
    'http://127.0.0.1:3000/local',
    'http://localhost:3001/local',
    'http://localhost:3000/local',
  ];

  return [...new Set(candidates.filter(Boolean))] as string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getReachableBackendBaseUrl(attempts = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    for (const baseUrl of getBackendBaseUrlCandidates()) {
      try {
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          return baseUrl;
        }
      } catch {
        // Try next candidate.
      }
    }

    if (attempt < attempts) {
      await delay(DEFAULT_RETRY_DELAY_MS);
    }
  }

  return null;
}

export async function isBackendAvailable(): Promise<boolean> {
  return (await getReachableBackendBaseUrl()) !== null;
}
