/**
 * useOpenLink — opening an external URL, and saying so when it does not open.
 *
 * Opening a link is platform territory (`window.open` on the DOM,
 * `Linking.openURL` on native), so the caller passes `openUrl` in — a wrapper,
 * never a bare method reference: RN's `Linking` is an instance whose `openURL`
 * reads `this`, and a bare reference throws before reaching the native module
 * (the explorer link lost a day to exactly that, 2026-09-13).
 *
 * The hook exists for the other half: a link that does not open used to be a
 * `console.warn` and nothing else, which on a phone looks identical to a tap
 * that did nothing. `errorText` is set when the open fails and cleared by the
 * next attempt; the caller draws it as an inline notice.
 *
 * @module hooks/useOpenLink
 */

import { useCallback, useState } from 'react';

export interface UseOpenLinkParams {
  /** Opens a URL — `window.open` on the DOM, `(url) => Linking.openURL(url)` on native. */
  openUrl: (url: string) => void | Promise<void>;
  /** `useTranslation()`'s `t`, for the failure line. */
  t: (key: string) => string;
}

export interface UseOpenLinkResult {
  /** Opens `url`. Never throws: a failure becomes `errorText`. */
  openLink: (url: string) => Promise<void>;
  /** Set when the last attempt did not reach a browser; `null` otherwise. */
  errorText: string | null;
}

export function useOpenLink({ openUrl, t }: UseOpenLinkParams): UseOpenLinkResult {
  const [failed, setFailed] = useState(false);

  const openLink = useCallback(
    async (url: string) => {
      setFailed(false);
      if (!url) {
        setFailed(true);
        return;
      }
      try {
        await openUrl(url);
      } catch (error) {
        console.warn('Failed to open link:', error);
        setFailed(true);
      }
    },
    [openUrl]
  );

  return { openLink, errorText: failed ? t('errors.linkOpenFailed') : null };
}
