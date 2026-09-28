/**
 * The store update gate's judgement: is the installed app older than the
 * oldest version the team still supports?
 *
 * The minimum comes from a small JSON the team publishes on its own domain
 * (`https://salmonwallet.io/app/mobile-release.json`), one entry per
 * platform. The mobile app fetches it at launch and, when the installed
 * version is below the minimum, shows the update screen instead of the
 * wallet. Everything that can go wrong — no network, a slow server, a
 * malformed file — reads as "not required": a wallet must never lock a user
 * out of their own funds because a config file was unreachable.
 *
 * Only the *decision* lives here. The store links the screen opens are
 * constants in the app, never read from the file: a compromised host must
 * not be able to send a wallet user to a URL of its choosing.
 */

export type StorePlatform = 'ios' | 'android';

/** A dotted numeric version, as app.json carries it: `1.2.0`. */
const VERSION = /^\d+(\.\d+){0,2}$/;

/**
 * Parses `1.2.0` into `[1, 2, 0]`; `null` for anything that is not a plain
 * dotted number (a pre-release tag, an empty string, a word).
 */
export function parseVersion(value: unknown): number[] | null {
  if (typeof value !== 'string' || !VERSION.test(value.trim())) return null;
  return value
    .trim()
    .split('.')
    .map((part) => Number(part));
}

/** `true` when `installed` is strictly older than `minimum`. */
export function isBelowVersion(installed: number[], minimum: number[]): boolean {
  const length = Math.max(installed.length, minimum.length);
  for (let i = 0; i < length; i += 1) {
    const a = installed[i] ?? 0;
    const b = minimum[i] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}

/**
 * Reads the platform's minimum version out of the published file. `null`
 * when the file does not carry a usable one, which the caller treats as
 * "no minimum".
 */
export function readMinimumVersion(file: unknown, platform: StorePlatform): number[] | null {
  if (typeof file !== 'object' || file === null) return null;
  const entry = (file as Record<string, unknown>)[platform];
  if (typeof entry !== 'object' || entry === null) return null;
  return parseVersion((entry as Record<string, unknown>).minimumVersion);
}

/**
 * The one question the gate asks. `false` unless both versions parse and the
 * installed one is older — every doubt opens the app.
 */
export function isUpdateRequired(
  installedVersion: unknown,
  file: unknown,
  platform: StorePlatform
): boolean {
  const installed = parseVersion(installedVersion);
  const minimum = readMinimumVersion(file, platform);
  if (!installed || !minimum) return false;
  return isBelowVersion(installed, minimum);
}
