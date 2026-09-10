/**
 * The Swap Powerup's route. The body is imported through `src/powerups`, the
 * entry Metro aliases to its empty twin when `EXPO_PUBLIC_POWERUPS` is off —
 * so this route exists in every build (the typed router is written against
 * it) and answers Home when the Powerup is not compiled in.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { POWERUPS_ENABLED, SwapRoute } from '../../src/powerups';

export default function SwapScreenRoute() {
  if (!POWERUPS_ENABLED || !SwapRoute) return <Redirect href="/" />;
  return <SwapRoute />;
}
