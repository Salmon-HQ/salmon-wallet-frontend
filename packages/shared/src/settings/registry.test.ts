/**
 * The settings table is read by both platforms, so what it promises is pinned
 * here once: every key it names exists in both locales, every toggle names a
 * setting that exists, and the trailing values read what the user chose.
 */
import { describe, expect, it } from 'vitest';

import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import type { UserConfig } from '../types/account';
import { getSettingsItemTestId } from '../types/settings';
import { CURRENCY_ITEMS, toAddressBookItems, toLanguageItems, toTrustedAppItems } from './items';
import { SETTINGS_GROUPS, settingsRowValues, type SettingsToggleKey } from './registry';

const lookup = (tree: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, tree);

const rows = SETTINGS_GROUPS.flatMap((group) => group.rows);

describe('SETTINGS_GROUPS', () => {
  it('names only keys both locales carry', () => {
    const keys = [
      ...SETTINGS_GROUPS.map((g) => g.titleKey),
      ...rows.map((r) => r.labelKey),
      ...rows.flatMap((r) => (r.kind === 'toggle' ? [r.descriptionKey] : [])),
    ];
    for (const key of keys) {
      expect(typeof lookup(en, key), `en ${key}`).toBe('string');
      expect(typeof lookup(es, key), `es ${key}`).toBe('string');
    }
  });

  it('keeps the five groups in the order the .pen draws them, danger last', () => {
    expect(SETTINGS_GROUPS.map((g) => g.titleKey)).toEqual([
      'settings.sections.account',
      'settings.sections.preferences',
      'settings.sections.advanced',
      'settings.sections.support',
      'settings.sections.danger_zone',
    ]);
    expect(SETTINGS_GROUPS.at(-1)?.isDanger).toBe(true);
    expect(SETTINGS_GROUPS.at(-1)?.rows.every((r) => r.kind === 'action' && r.isDanger)).toBe(true);
  });

  it('every toggle names a setting that exists, with its own e2e handle', () => {
    const toggles = rows.filter((r) => r.kind === 'toggle');
    expect(toggles.map((r) => r.id)).toEqual([
      'bitcoin',
      'analytics',
      'developerNetworks',
      'unverifiedTokens',
    ]);
    // Three of the four live on UserConfig; analytics is its own consent store.
    // Compile-time: the ids are the closed union both platforms switch on.
    const configFields: Record<Exclude<SettingsToggleKey, 'analytics'>, keyof UserConfig> = {
      bitcoin: 'bitcoinEnabled',
      developerNetworks: 'developerNetworks',
      unverifiedTokens: 'showUnverifiedTokens',
    };
    expect(Object.keys(configFields)).toHaveLength(3);
    expect(new Set(toggles.map((r) => r.testId)).size).toBe(toggles.length);
  });

  it('puts Token list second in Preferences, under Display Language', () => {
    const preferences = SETTINGS_GROUPS.find((g) => g.titleKey === 'settings.sections.preferences');
    expect(preferences?.rows.map((r) => r.id)).toEqual([
      'language',
      'tokenList',
      'currency',
      'explorer',
      'appearance',
      'bitcoin',
    ]);
    expect(preferences?.rows[1]).toEqual({
      id: 'tokenList',
      kind: 'panel',
      icon: 'stack',
      labelKey: 'settings.token_list',
    });
  });

  it('ends Preferences with the Bitcoin switch', () => {
    const preferences = SETTINGS_GROUPS.find((g) => g.titleKey === 'settings.sections.preferences');
    expect(preferences?.rows.at(-1)).toEqual({
      id: 'bitcoin',
      kind: 'toggle',
      icon: 'currencyBtc',
      labelKey: 'settings.bitcoin',
      descriptionKey: 'settings.bitcoin_description',
      testId: 'settings-bitcoin-toggle',
    });
    expect(getSettingsItemTestId('bitcoin')).toBe('settings-item-bitcoin');
  });

  it('gives every row a distinct id', () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});

describe('settingsRowValues', () => {
  const appearanceLabels = { system: 'System', light: 'Light', dark: 'Dark' };

  it('states the choice in proper nouns and codes', () => {
    expect(
      settingsRowValues({
        language: 'es',
        currency: 'usd',
        explorerName: 'Solscan',
        appearance: 'dark',
        appearanceLabels,
      })
    ).toEqual({ language: 'Español', currency: 'USD', explorer: 'Solscan', appearance: 'Dark' });
  });

  it('falls back to the raw code for an unknown language and leaves the rest undefined', () => {
    expect(settingsRowValues({ language: 'xx', appearance: 'system', appearanceLabels })).toEqual({
      language: 'xx',
      currency: undefined,
      explorer: undefined,
      appearance: 'System',
    });
  });

  it('passes the token list value through, and leaves it out when not given', () => {
    const base = { language: 'en', appearance: 'system', appearanceLabels };

    expect(settingsRowValues({ ...base, tokenList: '3 tokens' }).tokenList).toBe('3 tokens');
    expect(settingsRowValues(base).tokenList).toBeUndefined();
  });
});

describe('getSettingsItemTestId', () => {
  it('gives the token list row its slug', () => {
    expect(getSettingsItemTestId('tokenList')).toBe('settings-item-token-list');
  });
});

describe('the selector items', () => {
  it('lists every supported currency with its name and symbol', () => {
    expect(CURRENCY_ITEMS.find((c) => c.code === 'usd')).toEqual({
      code: 'usd',
      name: 'US Dollar',
      symbol: '$',
    });
  });

  it('names a language natively, or by its code when unknown', () => {
    expect(toLanguageItems(['en', 'zz'])).toEqual([
      { code: 'en', nativeName: 'English' },
      { code: 'zz', nativeName: 'zz' },
    ]);
  });

  it('flattens contacts and trusted apps to their rows', () => {
    expect(
      toAddressBookItems([
        { name: 'Ana', address: 'A1', network: { id: 'solana-mainnet', name: 'Solana' } },
      ])
    ).toEqual([{ name: 'Ana', address: 'A1', networkId: 'solana-mainnet', networkName: 'Solana' }]);
    expect(toTrustedAppItems({ 'app.io': { name: 'App', icon: 'i.png' } })).toEqual([
      { domain: 'app.io', name: 'App', icon: 'i.png' },
    ]);
    expect(toTrustedAppItems(undefined)).toEqual([]);
  });
});
