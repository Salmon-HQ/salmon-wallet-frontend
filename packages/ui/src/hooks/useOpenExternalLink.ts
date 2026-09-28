/**
 * The DOM half of `useOpenLink`: a new tab, and the app's `t`.
 *
 * `window.open` returns `null` when the browser refuses — the side panel's
 * popup blocker does — which is a failure the user is owed, so it is turned
 * into one the hook can report.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOpenLink, type UseOpenLinkResult } from '@salmon/shared';

export function useOpenExternalLink(): UseOpenLinkResult {
  const { t } = useTranslation();
  const openUrl = useCallback((url: string) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) throw new Error('the browser refused to open a new tab');
  }, []);
  return useOpenLink({ openUrl, t });
}
