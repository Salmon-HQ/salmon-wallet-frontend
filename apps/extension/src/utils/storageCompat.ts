import { browser } from 'wxt/browser';

/**
 * Compatible session storage area: storage.session, which Chrome MV3 and
 * Firefox 115+ (MV2 included) provide. The storage.local fallback is on disk,
 * so nothing secret may be written through this area.
 */
export const sessionArea = browser.storage.session ?? browser.storage.local;
