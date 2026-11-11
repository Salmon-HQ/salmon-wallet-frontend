/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { CURRENCY_ITEMS } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { CurrencySelector } from './CurrencySelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(cleanup);

function renderSelector(onSelectCurrency = vi.fn()) {
  renderInMode(
    'dark',
    <CurrencySelector
      currencies={CURRENCY_ITEMS}
      activeCurrencyCode="usd"
      onSelectCurrency={onSelectCurrency}
      onBack={() => {}}
    />
  );
  return onSelectCurrency;
}

const search = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText('Search currency'), { target: { value: text } });

describe('CurrencySelector — search', () => {
  it('lists every currency until the user types', () => {
    renderSelector();
    expect(screen.getAllByTestId(/^currency-option-/).length).toBeGreaterThanOrEqual(45);
  });

  it('narrows the list to what the query names, and selects from it', () => {
    const onSelect = renderSelector();

    search('koruna');

    expect(screen.queryByText('US Dollar')).toBeNull();
    fireEvent.click(screen.getByText('Czech Koruna'));
    expect(onSelect).toHaveBeenCalledWith('czk');
  });

  it('says so when nothing matches', () => {
    renderSelector();

    search('bitcoin');

    expect(screen.getByTestId('currency-no-match')).toBeTruthy();
    expect(screen.getByText('No currencies match')).toBeTruthy();
  });
});
