import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './config';
import { getStoredLanguage } from './useLanguage';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * I18nProvider component that wraps the app with i18next context.
 * It initializes i18n with the stored language preference or device language.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Check if there's a stored language preference
        const storedLanguage = await getStoredLanguage();
        if (storedLanguage && storedLanguage !== i18n.language) {
          await i18n.changeLanguage(storedLanguage);
        }
      } catch (error) {
        console.warn('Failed to load stored language:', error);
      }
    };

    initializeLanguage();
  }, []);

  // We can render immediately since i18n is already initialized with device language
  // The effect above will update to stored preference if different
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
