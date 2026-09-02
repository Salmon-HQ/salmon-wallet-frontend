import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { i18nResources, DEFAULT_LANGUAGE, AVAILABLE_LANGUAGES } from '@salmon/shared';

// Initialize i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize configuration
  .init({
    resources: i18nResources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: AVAILABLE_LANGUAGES,

    detection: {
      order: ['navigator', 'htmlTag'],
    },

    interpolation: {
      // React already escapes values
      escapeValue: false,
    },

    // React i18next options
    react: {
      // Use suspense for loading translations
      useSuspense: false,
    },
  });

export default i18n;
