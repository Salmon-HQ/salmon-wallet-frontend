/**
 * The language setting — one hook for every platform.
 *
 * i18next is the source of truth for what the app is showing right now; this
 * hook subscribes to it, so the value is live wherever it is read, and it
 * persists the user's choice under `STORAGE_KEYS.LANGUAGE` and restores it on
 * the first mount after the app boots with the device's language.
 *
 * @module hooks/useLanguage
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import i18n from 'i18next';
import { getStorage, STORAGE_KEYS } from '../storage';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES,
  isLanguageSupported,
  type LanguageCode,
} from '../locales';

export interface UseLanguageResult {
  /** The language the app is showing. */
  currentLanguage: LanguageCode;
  /** Every language the app ships. */
  availableLanguages: readonly LanguageCode[];
  /** Native display name per code. */
  languageNames: Record<LanguageCode, string>;
  /** Switch the app and persist the choice. */
  changeLanguage: (code: LanguageCode) => Promise<void>;
}

const subscribe = (onChange: () => void) => {
  i18n.on('languageChanged', onChange);
  return () => i18n.off('languageChanged', onChange);
};

/** i18next may report a region tag (`es-AR`); the setting is the base code. */
const current = (): LanguageCode => {
  const lang = (i18n.language ?? '').split('-')[0];
  return isLanguageSupported(lang) ? lang : DEFAULT_LANGUAGE;
};

export function useLanguage(): UseLanguageResult {
  const currentLanguage = useSyncExternalStore(subscribe, current, () => DEFAULT_LANGUAGE);

  // Restore the persisted choice once. The boot config picks the device's
  // language; a user who chose otherwise gets their choice back here.
  useEffect(() => {
    let cancelled = false;
    getStorage()
      .getItem<string>(STORAGE_KEYS.LANGUAGE)
      .then((saved) => {
        if (cancelled || !saved || !isLanguageSupported(saved) || saved === current()) return;
        return i18n.changeLanguage(saved);
      })
      .catch((error) => console.error('Failed to load language preference:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLanguage = useCallback(async (code: LanguageCode): Promise<void> => {
    if (!AVAILABLE_LANGUAGES.includes(code)) {
      console.error(`Invalid language code: ${code}`);
      return;
    }
    await i18n.changeLanguage(code);
    try {
      await getStorage().setItem(STORAGE_KEYS.LANGUAGE, code);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  return {
    currentLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    languageNames: LANGUAGE_NAMES,
    changeLanguage,
  };
}
