/**
 * Localization module for shared translations.
 *
 * This module exports translations, language utilities, and TypeScript types
 * for internationalization across mobile and extension platforms.
 *
 * @module locales
 */

import en from './en/translation.json';
import es from './es/translation.json';

// ============================================================================
// Translation Resources
// ============================================================================

/**
 * All available translations organized by language code.
 *
 * @example
 * ```typescript
 * import { translations } from '@salmon/shared';
 *
 * // Use with i18next
 * i18n.init({
 *   resources: {
 *     en: { translation: translations.en },
 *     es: { translation: translations.es },
 *   },
 * });
 * ```
 */
export const translations = {
  en,
  es,
} as const;

// ============================================================================
// Language Types and Constants
// ============================================================================

/**
 * Supported language codes.
 */
export type LanguageCode = keyof typeof translations;

/**
 * Alias for LanguageCode - commonly used naming convention.
 */
export type SupportedLanguage = LanguageCode;

/**
 * Array of all available language codes.
 *
 * @example
 * ```typescript
 * import { AVAILABLE_LANGUAGES } from '@salmon/shared';
 *
 * // Use in a language selector
 * AVAILABLE_LANGUAGES.map(lang => (
 *   <Option key={lang} value={lang}>{lang}</Option>
 * ));
 * ```
 */
export const AVAILABLE_LANGUAGES: LanguageCode[] = Object.keys(translations) as LanguageCode[];

/**
 * Alias for AVAILABLE_LANGUAGES - commonly used naming convention.
 */
export const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES;

/**
 * Default language for the application.
 */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Language display names for UI.
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
} as const;

// ============================================================================
// Translation Key Types
// ============================================================================

/**
 * Type representing the structure of translation files.
 */
export type TranslationResource = typeof en;

/**
 * Helper type to flatten nested object keys with dot notation.
 */
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? T[K] extends Record<string, unknown>
            ? FlattenKeys<T[K], `${Prefix}${K}.`>
            : `${Prefix}${K}`
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;

/**
 * All valid translation keys in dot notation format.
 *
 * @example
 * ```typescript
 * import { TranslationKey } from '@salmon/shared';
 *
 * // Type-safe translation key
 * const key: TranslationKey = 'settings.title'; // Valid
 * const key2: TranslationKey = 'invalid.key'; // Error
 * ```
 */
export type TranslationKey = FlattenKeys<TranslationResource>;

// ============================================================================
// i18n Configuration Helper
// ============================================================================

/**
 * i18next resources configuration object.
 *
 * Pre-configured resources object for i18next initialization.
 *
 * @example
 * ```typescript
 * import { i18nResources } from '@salmon/shared';
 *
 * i18n.init({
 *   resources: i18nResources,
 *   lng: 'en',
 *   fallbackLng: 'en',
 * });
 * ```
 */
export const i18nResources = {
  en: { translation: en },
  es: { translation: es },
} as const;

/**
 * Type for i18next resources configuration.
 */
export type I18nResources = typeof i18nResources;

/**
 * Returns i18next resources configuration object.
 *
 * Helper function that returns the resources object for i18next initialization.
 * This is useful when you need to call it as a function or for lazy loading.
 *
 * @example
 * ```typescript
 * import { getTranslationResources } from '@salmon/shared';
 *
 * i18n.init({
 *   resources: getTranslationResources(),
 *   lng: 'en',
 *   fallbackLng: 'en',
 * });
 * ```
 *
 * @returns i18next resources configuration object
 */
export function getTranslationResources(): I18nResources {
  return i18nResources;
}

/**
 * Returns translations for a specific language.
 *
 * Note: The returned type is the English translation structure (TranslationResource),
 * which serves as the reference. Other languages may have missing keys at runtime.
 *
 * @param lang - The language code to get translations for
 * @returns The translation object for the specified language
 *
 * @example
 * ```typescript
 * import { getTranslationsForLanguage } from '@salmon/shared';
 *
 * const esTranslations = getTranslationsForLanguage('es');
 * console.log(esTranslations.general.home); // 'Inicio'
 * ```
 */
export function getTranslationsForLanguage(lang: LanguageCode): TranslationResource {
  return translations[lang] as TranslationResource;
}

/**
 * Checks if a language code is supported.
 *
 * @param lang - The language code to check
 * @returns True if the language is supported, false otherwise
 *
 * @example
 * ```typescript
 * import { isLanguageSupported } from '@salmon/shared';
 *
 * isLanguageSupported('en'); // true
 * isLanguageSupported('fr'); // false
 * ```
 */
export function isLanguageSupported(lang: string): lang is LanguageCode {
  return AVAILABLE_LANGUAGES.includes(lang as LanguageCode);
}
