/**
 * The powerups route. The browse screen is imported through `src/powerups`,
 * the entry Metro aliases to its empty twin when `EXPO_PUBLIC_POWERUPS` is
 * off — so the route stays registered in every build (the typed router and
 * the `+` control are written against it) and sends anyone who reaches it
 * Home when Powerups are not compiled in (spec 027 §3).
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { POWERUPS_ENABLED, PowerupsRoute } from '../../src/powerups';

export default function PowerupsScreenRoute() {
  if (!POWERUPS_ENABLED || !PowerupsRoute) return <Redirect href="/" />;
  return <PowerupsRoute />;
}
