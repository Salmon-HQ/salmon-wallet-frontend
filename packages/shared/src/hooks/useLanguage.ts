/**
 * Language hook for managing user language preferences.
 *
 * This hook provides functionality for:
 * - Getting the current language
 * - Changing the language
 * - Persisting language preference to storage
 *
 * @module hooks/useLanguage
 */

import { useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { getStorage, STORAGE_KEYS } from '../storage';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES,
  type LanguageCode,
} from '../locales';

// ============================================================================
// Types
// ============================================================================

/**
 * Return type for the useLanguage hook.
 */
export interface UseLanguageResult {
  /** The currently selected language code */
  language: LanguageCode;
  /** Display name for the current language */
  languageName: string;
  /** List of all available languages */
  availableLanguages: LanguageCode[];
  /** Map of language codes to display names */
  languageNames: Record<LanguageCode, string>;
  /** Changes the current language */
  changeLanguage: (languageCode: LanguageCode) => Promise<void>;
  /** Whether the language preference is still loading */
  isLoading: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing user language preferences.
 *
 * This hook handles:
 * - Loading the saved language preference from storage
 * - Changing and persisting the language preference
 * - Providing available languages for UI selection
 *
 * @returns Language state and actions
 *
 * @example
 * ```typescript
 * import { useLanguage } from '@salmon/shared/hooks';
 * import { useTranslation } from 'react-i18next';
 *
 * function LanguageSelector() {
 *   const { i18n } = useTranslation();
 *   const {
 *     language,
 *     languageName,
 *     availableLanguages,
 *     languageNames,
 *     changeLanguage,
 *     isLoading,
 *   } = useLanguage();
 *
 *   const handleLanguageChange = async (lang: LanguageCode) => {
 *     await changeLanguage(lang);
 *     await i18n.changeLanguage(lang);
 *   };
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <View>
 *       <Text>Current: {languageName}</Text>
 *       {availableLanguages.map(lang => (
 *         <TouchableOpacity
 *           key={lang}
 *           onPress={() => handleLanguageChange(lang)}
 *         >
 *           <Text>{languageNames[lang]}</Text>
 *         </TouchableOpacity>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLanguage(): UseLanguageResult {
  // State
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      setIsLoading(true);

      try {
        const storage = getStorage();
        const savedLanguage = await storage.getItem<LanguageCode>(STORAGE_KEYS.LANGUAGE);

        if (savedLanguage && AVAILABLE_LANGUAGES.includes(savedLanguage)) {
          setLanguage(savedLanguage);
          await i18n.changeLanguage(savedLanguage);
        } else {
          // Set default language if no valid preference exists
          setLanguage(DEFAULT_LANGUAGE);
          await i18n.changeLanguage(DEFAULT_LANGUAGE);
          await storage.setItem(STORAGE_KEYS.LANGUAGE, DEFAULT_LANGUAGE);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
        setLanguage(DEFAULT_LANGUAGE);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  /**
   * Changes the current language and persists to storage.
   */
  const changeLanguage = useCallback(async (languageCode: LanguageCode): Promise<void> => {
    if (!AVAILABLE_LANGUAGES.includes(languageCode)) {
      console.error(`Invalid language code: ${languageCode}`);
      return;
    }

    // Update local state + i18next
    setLanguage(languageCode);
    await i18n.changeLanguage(languageCode);

    // Persist to storage
    try {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.LANGUAGE, languageCode);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  return {
    language,
    languageName: LANGUAGE_NAMES[language],
    availableLanguages: AVAILABLE_LANGUAGES,
    languageNames: LANGUAGE_NAMES,
    changeLanguage,
    isLoading,
  };
}
