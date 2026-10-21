/**
 * The extension's analytics start-up (spec 042). Every window runs its own
 * client and session. Opening the side panel (sidebar on Firefox) is an app
 * open; a window the background opens to approve a dApp's request is not.
 *
 * Only a copy installed from a store reaches production analytics (FR-014).
 * The store package and the unpacked e2e build are the same bytes (AMO rebuilds
 * them), so the browser is asked at runtime how this copy was installed.
 */
import { APP_VERSION, getAnalytics, initAnalytics, STORAGE_KEYS, trackEvent } from '@salmon/shared';
import { browser } from 'wxt/browser';

/** Whether this window was launched to approve a dApp request (the background puts it in the hash). */
export function isDAppApprovalLaunch(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Boolean(params.get('origin') && params.get('request'));
}

/**
 * Unpacked loads (developers, Playwright) report `development`. A check that
 * fails counts as not a store copy: losing data beats polluting production.
 * `getSelf` needs no `management` permission.
 */
async function isStoreInstall(): Promise<boolean> {
  try {
    return (await browser.management.getSelf()).installType !== 'development';
  } catch {
    return false;
  }
}

/** Starts the client (no events until the user opts in). Once per window, before React mounts. */
export function startExtensionAnalytics(): void {
  initAnalytics({ platform: 'extension', appVersion: APP_VERSION, storeBuild: isStoreInstall() });
  if (!isDAppApprovalLaunch(window.location.hash)) trackEvent('app_opened');

  // A window often closes before the 30-second send; the flush reaches `fetch`
  // (keepalive) before the page is gone.
  window.addEventListener('pagehide', () => void getAnalytics()?.flush());

  // Every window has its own client but they share storage: a withdrawal made
  // in one window stops the others too, before they send anything more.
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const consent = changes[STORAGE_KEYS.ANALYTICS_CONSENT];
    if (consent && consent.newValue !== JSON.stringify(true)) getAnalytics()?.forgetConsent();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void getAnalytics()?.flush();
  });
}
