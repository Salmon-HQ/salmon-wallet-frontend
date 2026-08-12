import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { i18nResources, DEFAULT_LANGUAGE, isLanguageSupported } from '@salmon/shared';

// Get the device language code (e.g., 'en', 'es')
const getDeviceLanguage = (): string => {
  const locales = getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    if (languageCode && isLanguageSupported(languageCode)) {
      return languageCode;
    }
  }
  return DEFAULT_LANGUAGE;
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false, // React already handles XSS protection
  },
  react: {
    useSuspense: false, // Disable suspense to avoid issues with React Native
  },
});

export default i18n;
