import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import {
  i18nResources,
  DEFAULT_LANGUAGE,
  isLanguageSupported,
  withPowerupTranslations,
} from '@salmon/shared';
import { powerupTranslations } from '@salmon/shared/powerups';

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
  // Powerup copy rides along under its namespace; an off build merges nothing.
  resources: withPowerupTranslations(i18nResources, powerupTranslations),
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
