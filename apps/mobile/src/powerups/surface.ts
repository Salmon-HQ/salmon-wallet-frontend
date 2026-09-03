/**
 * Whether the powerups surface — the `+` control on Home and the browse
 * screen it opens — is shown at all.
 *
 * Off for the next App Store submission (owner, 2026-09-02): the build ships
 * Portfolio and NFTs only, after Apple's 3.1.5(iii) rejection of 1.0.3.
 *
 * This flag closes the *control*, which was not the whole door: Expo Router
 * kept answering `salmonwallet://powerups`, so the screen stayed reachable by
 * deep link with no UI offering it (owner, 2026-09-03). The screen is parked
 * off the router in `src/screens/PowerupsRoute.tsx` as well, so bringing the
 * surface back now takes both — flip this *and* re-add the route. The screen,
 * the catalogue and the FAB stay built; nothing was deleted.
 */
export const POWERUPS_SURFACE_ENABLED = false;
