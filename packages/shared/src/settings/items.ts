/**
 * The lists the settings panels choose from, built from the app's own data.
 *
 * Both panel registries (mobile's `useSettingsPanelRegistry`, the side
 * panel's `panelRegistry` memo) used to map these inline, identically. The
 * JSX wiring stays per platform; the mapping lives once.
 */
import { CURRENCY_MAP, SUPPORTED_CURRENCIES } from '../types/currency';
import { LANGUAGE_NAMES, type LanguageCode } from '../locales';
import type {
  AddressBookItem,
  CurrencySelectorItem,
  ExplorerSelectorItem,
  LanguageSelectorItem,
  TrustedAppItem,
} from '../types/settings';

/** Every supported currency, as the selector lists it. */
export const CURRENCY_ITEMS: CurrencySelectorItem[] = SUPPORTED_CURRENCIES.map((code) => ({
  code,
  name: CURRENCY_MAP[code].name,
  symbol: CURRENCY_MAP[code].symbol,
}));

export function toLanguageItems(codes: readonly string[]): LanguageSelectorItem[] {
  return codes.map((code) => ({
    code,
    nativeName: LANGUAGE_NAMES[code as LanguageCode] || code,
  }));
}

export function toExplorerItems(
  explorers: readonly { key: string; name: string }[]
): ExplorerSelectorItem[] {
  return explorers.map((e) => ({ key: e.key, name: e.name }));
}

export function toTrustedAppItems(
  activeTrustedApps: Record<string, { name?: string; icon?: string }> | undefined
): TrustedAppItem[] {
  return Object.entries(activeTrustedApps || {}).map(([domain, app]) => ({
    domain,
    name: app.name,
    icon: app.icon,
  }));
}

/** An address-book contact flattened to the row the panel draws. */
export function toAddressBookItems(
  contacts: readonly {
    name: string;
    address: string;
    network: { id: string; name: string };
    domain?: string | null;
  }[]
): AddressBookItem[] {
  return contacts.map((c) => ({
    name: c.name,
    address: c.address,
    networkId: c.network.id,
    networkName: c.network.name,
    domain: c.domain,
  }));
}
