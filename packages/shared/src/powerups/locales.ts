/**
 * The Powerups' copy, one namespace per Powerup. Merged into the app's
 * resources by `locales/index.ts` through the aliased `powerups` entry, so a
 * build with Powerups off carries none of these strings (spec 027 §3).
 */
import swapEn from './swap/locales/en.json';
import swapEs from './swap/locales/es.json';

export const powerupTranslations = {
  en: { swap: swapEn },
  es: { swap: swapEs },
} as const;
