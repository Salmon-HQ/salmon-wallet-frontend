/**
 * The mobile half of `useOpenLink`: the native opener and the app's `t`.
 *
 * `Linking.openURL` is wrapped, never passed bare — it is a prototype method
 * on an instance and reads `this`, so a bare reference throws before reaching
 * the native module and the tap does nothing at all.
 */
import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOpenLink, type UseOpenLinkResult } from '@salmon/shared';

export function useOpenExternalLink(): UseOpenLinkResult {
  const { t } = useTranslation();
  const openUrl = useCallback((url: string) => Linking.openURL(url), []);
  return useOpenLink({ openUrl, t });
}
