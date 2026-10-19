/**
 * The extension's analytics start-up (spec 042). Every window runs its own
 * client and session. Opening the side panel (sidebar on Firefox) is an app
 * open; a window the background opens to approve a dApp's request is not.
 */
import { APP_VERSION, initAnalytics, trackEvent } from '@salmon/shared';

/** Whether this window was launched to approve a dApp request (the background puts it in the hash). */
export function isDAppApprovalLaunch(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return Boolean(params.get('origin') && params.get('request'));
}

/** Starts the client (no events until the user opts in). Once per window. */
export function startExtensionAnalytics(): void {
  initAnalytics({ platform: 'extension', appVersion: APP_VERSION });
  if (!isDAppApprovalLaunch(window.location.hash)) trackEvent('app_opened');
}
