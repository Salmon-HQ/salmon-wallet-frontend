import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES, isLanguageSupported, type LanguageCode } from '@salmon/shared';
import { changeLanguage, getCurrentLanguage } from './config';

export interface UseLanguageReturn {
  /** Current language code */
  currentLanguage: LanguageCode;
  /** All supported languages */
  supportedLanguages: readonly LanguageCode[];
  /** Change the current language */
  setLanguage: (lang: LanguageCode) => Promise<void>;
  /** Check if a language is supported */
  isSupported: (lang: string) => lang is LanguageCode;
  /** Get localized language name */
  getLanguageName: (lang: LanguageCode) => string;
}

/**
 * Hook to manage language settings in the extension
 * @returns Language management utilities
 */
export const useLanguage = (): UseLanguageReturn => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(getCurrentLanguage());

  // Sync state when i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lang: string) => {
      if (isLanguageSupported(lang)) {
        setCurrentLanguage(lang);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const setLanguage = useCallback(async (lang: LanguageCode): Promise<void> => {
    await changeLanguage(lang);
    setCurrentLanguage(lang);
  }, []);

  const getLanguageName = useCallback(
    (lang: LanguageCode): string => {
      return t(`settings.languages.${lang}`);
    },
    [t]
  );

  return {
    currentLanguage,
    supportedLanguages: AVAILABLE_LANGUAGES,
    setLanguage,
    isSupported: isLanguageSupported,
    getLanguageName,
  };
};

export default useLanguage;
