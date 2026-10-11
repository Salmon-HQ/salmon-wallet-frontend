/**
 * The Powerups' copy, one namespace per Powerup. Merged into the app's
 * resources by `locales/index.ts` through the aliased `powerups` entry, so a
 * build with Powerups off carries none of these strings (spec 027 §3).
 */
import memoEn from './memo/locales/en.json';
import memoEs from './memo/locales/es.json';
import paymentsEn from './payments/locales/en.json';
import paymentsEs from './payments/locales/es.json';
import swapEn from './swap/locales/en.json';
import swapEs from './swap/locales/es.json';
import skrEn from './skr/locales/en.json';
import skrEs from './skr/locales/es.json';

export const powerupTranslations = {
  en: { memo: memoEn, payments: paymentsEn, swap: swapEn, skr: skrEn },
  es: { memo: memoEs, payments: paymentsEs, swap: swapEs, skr: skrEs },
} as const;
