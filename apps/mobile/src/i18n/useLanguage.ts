import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as SecureStore from '../../utils/secureStore';
import {
  LANGUAGE_NAMES,
  AVAILABLE_LANGUAGES,
  isLanguageSupported,
  STORAGE_KEYS,
  type LanguageCode,
} from '@salmon/shared';

/**
 * Get the stored language preference from SecureStore
 * This is exported for use in I18nProvider initialization
 */
export async function getStoredLanguage(): Promise<LanguageCode | null> {
  try {
    const storedLanguage = await SecureStore.getItemAsync(STORAGE_KEYS.LANGUAGE);
    if (storedLanguage && isLanguageSupported(storedLanguage)) {
      return storedLanguage;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get stored language:', error);
    return null;
  }
}

/**
 * Store the language preference in SecureStore
 */
async function storeLanguage(language: LanguageCode): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.LANGUAGE, language);
  } catch (error) {
    console.warn('Failed to store language:', error);
  }
}

/**
 * Custom hook for managing language preferences
 * Provides current language, available languages, and a function to change language
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  // Get current language
  const currentLanguage = i18n.language as LanguageCode;

  // Get display name for current language
  const currentLanguageDisplay = LANGUAGE_NAMES[currentLanguage] || LANGUAGE_NAMES.en;

  // Change language and persist to storage
  const changeLanguage = useCallback(
    async (language: LanguageCode) => {
      if (language === currentLanguage) return;

      setIsChanging(true);
      try {
        await i18n.changeLanguage(language);
        await storeLanguage(language);
      } catch (error) {
        console.error('Failed to change language:', error);
      } finally {
        setIsChanging(false);
      }
    },
    [i18n, currentLanguage]
  );

  // Get list of available languages
  const availableLanguages = AVAILABLE_LANGUAGES.map((code) => ({
    code,
    name: LANGUAGE_NAMES[code],
    isSelected: code === currentLanguage,
  }));

  return {
    currentLanguage,
    currentLanguageDisplay,
    availableLanguages,
    changeLanguage,
    isChanging,
    languageNames: LANGUAGE_NAMES,
  };
}
