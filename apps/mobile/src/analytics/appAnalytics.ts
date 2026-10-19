/**
 * The mobile app's analytics start-up and its open rule (spec 042).
 *
 * An open is the app starting, or coming back to the screen after the wallet's
 * lock rule saw it leave: `app/_layout.tsx` notes the leave exactly where it
 * locks, so an open and a lock always agree. An iOS overlay (`inactive`), a
 * Seed Vault screen or a Mobile Wallet Adapter sheet is not an open.
 *
 * Only a store build reaches production analytics (FR-014): EAS bakes the
 * `production` channel into the `production`, `production-apk` and
 * `dapp-store` builds; dev clients, simulators and every other profile report
 * another channel or none.
 */
import { getAnalytics, initAnalytics, trackEvent, type AnalyticsPlatform } from '@salmon/shared';
import * as Updates from 'expo-updates';
import { AppState, Platform } from 'react-native';

import { loadDeviceCapabilities } from '../seed-vault/useDeviceCapabilities';

// Seed Vault answers a local query in milliseconds. Every batch, the consent
// prompt, the Settings toggle and the deferred onboarding events wait for the
// platform, so a check that hangs must not hold them: past this bound the phone
// reports `android`. Two seconds leaves a slow cold start room to answer and is
// over long before a user reaches either consent surface.
export const SEEKER_CHECK_TIMEOUT_MS = 2_000;

let started = false;
let away = false;
let mwaOnScreen = false;

async function seekerOrAndroid(): Promise<AnalyticsPlatform> {
  try {
    return (await loadDeviceCapabilities()).includes('seed-vault') ? 'seeker' : 'android';
  } catch {
    return 'android';
  }
}

/** Never rejects, and settles within {@link SEEKER_CHECK_TIMEOUT_MS}. */
function androidPlatform(): Promise<AnalyticsPlatform> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<AnalyticsPlatform>((resolve) => {
    timer = setTimeout(() => resolve('android'), SEEKER_CHECK_TIMEOUT_MS);
  });
  return Promise.race([seekerOrAndroid(), fallback]).finally(() => clearTimeout(timer));
}

/** Starts the client (no events until the user opts in). Once per process. */
export function startAnalytics(appVersion: string): void {
  initAnalytics({
    platform: Platform.OS === 'ios' ? 'ios' : androidPlatform(),
    appVersion,
    storeBuild: Updates.channel === 'production',
  });
  AppState.addEventListener('change', (state) => {
    // What is queued leaves now rather than 30 s later, which a backgrounded app may never see.
    if (state === 'background') void getAnalytics()?.flush();
    if (state !== 'active' || !away || mwaOnScreen) return;
    away = false;
    getAnalytics()?.startSession();
    trackEvent('app_opened');
  });
}

/** The first mount of the app's navigator; a process Mobile Wallet Adapter started never mounts it. */
export function trackColdOpen(): void {
  if (started) return;
  started = true;
  trackEvent('app_opened');
}

/** Called where the wallet's lock rule sees the app leave the screen. */
export function noteAppLeft(): void {
  away = true;
}

/** While the Mobile Wallet Adapter root is up, coming to the screen is the dApp's sheet, not an open. */
export function setMwaOnScreen(on: boolean): void {
  mwaOnScreen = on;
}
