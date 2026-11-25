/**
 * @vitest-environment jsdom
 *
 * The Token list screen both apps draw: its two lists, which option is
 * marked, and that a pick writes one half of the choice and keeps the other.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TokenListPreference } from '../utils/tokenListFold';

let preference: TokenListPreference = { maxCount: null, minValue: null };
const setTokenListPreference = vi.fn(async () => {});

vi.mock('../contexts/DeveloperModeContext', () => ({
  useTokenListPreference: () => ({ tokenListPreference: preference, setTokenListPreference }),
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: 'usd', exchangeRate: 1 },
    { formatValue: (usd: number) => `$${usd.toFixed(2)}` },
  ],
}));

vi.mock('react-i18next', async () => {
  const i18next = (await import('i18next')).default.createInstance();
  const en = (await import('../locales/en/translation.json')).default;
  await i18next.init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return { useTranslation: () => ({ t: i18next.t.bind(i18next) }) };
});

import { createTokenListPanel, type TokenListPanelKit } from './createTokenListPanel';

// Plain stand-ins for the platform parts: the screen's decisions are what is
// under test, not how each platform draws a row.
const kit: TokenListPanelKit = {
  Frame: ({ title, subtitle, children }) => (
    <section aria-label={title}>
      <p>{subtitle}</p>
      {children}
    </section>
  ),
  SectionLabel: ({ children }) => <h2>{children}</h2>,
  SettingsSelectorList: ({ items, getKey, isSelected, onSelect, getPrimaryText, testIdPrefix }) => (
    <div>
      {items.map((item) => (
        <button
          key={getKey(item)}
          type="button"
          data-testid={`${testIdPrefix}-${getKey(item)}`}
          aria-pressed={isSelected(item)}
          onClick={() => onSelect(item)}
        >
          {getPrimaryText(item)}
        </button>
      ))}
    </div>
  ),
};
const TokenListPanel = createTokenListPanel(kit);

beforeEach(() => {
  preference = { maxCount: null, minValue: null };
});
afterEach(cleanup);

describe('createTokenListPanel', () => {
  it('draws both lists under their headings, with every option', () => {
    render(<TokenListPanel onBack={() => {}} />);

    expect(screen.getByRole('region', { name: 'Token list' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tokens shown' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Hide tokens worth less than' })).toBeTruthy();
    for (const key of ['all', '3', '5', '10', '20']) {
      expect(screen.getByTestId(`token-list-count-${key}`)).toBeTruthy();
    }
    for (const key of ['off', '1', '5', '10', '50']) {
      expect(screen.getByTestId(`token-list-min-value-${key}`)).toBeTruthy();
    }
  });

  it('marks the stored choice', () => {
    preference = { maxCount: 3, minValue: null };
    render(<TokenListPanel onBack={() => {}} />);

    expect(screen.getByTestId('token-list-count-3').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('token-list-count-all').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('token-list-min-value-off').getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('writes only the half that was picked', () => {
    preference = { maxCount: null, minValue: 5 };
    render(<TokenListPanel onBack={() => {}} />);

    fireEvent.click(screen.getByTestId('token-list-count-3'));
    expect(setTokenListPreference).toHaveBeenLastCalledWith({ maxCount: 3 });

    fireEvent.click(screen.getByTestId('token-list-min-value-off'));
    expect(setTokenListPreference).toHaveBeenLastCalledWith({ minValue: null });
  });
});
