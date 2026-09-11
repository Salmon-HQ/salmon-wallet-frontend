/**
 * The Powerups' copy, one namespace per Powerup. Merged into the app's
 * resources by `locales/index.ts` through the aliased `powerups` entry, so a
 * build with Powerups off carries none of these strings (spec 027 §3).
 */
import kaminoEn from './kamino-positions/locales/en.json';
import kaminoEs from './kamino-positions/locales/es.json';
import swapEn from './swap/locales/en.json';
import swapEs from './swap/locales/es.json';

export const powerupTranslations = {
  en: { swap: swapEn, 'kamino-positions': kaminoEn },
  es: { swap: swapEs, 'kamino-positions': kaminoEs },
} as const;
