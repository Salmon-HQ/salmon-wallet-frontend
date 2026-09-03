/**
 * The powerups route, closed.
 *
 * The surface is not in this release. `POWERUPS_SURFACE_ENABLED` already hid
 * its `+` control, but hiding a control is not closing a door: Expo Router
 * kept answering `salmonwallet://powerups`, so the screen was reachable by
 * deep link with no UI offering it (owner, 2026-09-03).
 *
 * The route stays registered and sends anyone who reaches it Home. It is not
 * deleted, because the typed router is what the `+` control and its tests are
 * written against, and because the way back is this file: spec 027 replaces
 * the redirect with `export { default } from '../../src/screens/PowerupsRoute'`
 * and flips the flag. The screen itself is parked there, whole.
 */
import { Redirect } from 'expo-router';

export default function PowerupsClosed() {
  return <Redirect href="/" />;
}
