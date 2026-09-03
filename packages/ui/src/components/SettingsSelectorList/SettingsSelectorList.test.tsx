/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { SettingsSelectorList } from './SettingsSelectorList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(cleanup);

type Option = { id: string; label: string };

const OPTIONS: Option[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
];

function renderList(selectedId: string, onSelect = vi.fn()) {
  renderInMode(
    'dark',
    <SettingsSelectorList<Option>
      items={OPTIONS}
      getKey={(item) => item.id}
      isSelected={(item) => item.id === selectedId}
      onSelect={onSelect}
      getPrimaryText={(item) => item.label}
      testIdPrefix="language-option"
    />
  );
  return onSelect;
}

describe('SettingsSelectorList — a row per choice, the chosen one marked', () => {
  it('draws one pressable row per option, named by its label', () => {
    renderList('en');

    expect(screen.getByRole('button', { name: 'English' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Spanish' })).toBeTruthy();
  });

  it('marks only the active option with the check', () => {
    renderList('es');

    expect(screen.getByTestId('language-option-es-selected')).toBeTruthy();
    expect(screen.queryByTestId('language-option-en-selected')).toBeNull();
  });

  it('selects an option when it is activated', () => {
    const onSelect = renderList('en');

    fireEvent.click(screen.getByTestId('language-option-es'));

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it('stands in for the rows while loading, and names the wait', () => {
    renderInMode(
      'dark',
      <SettingsSelectorList<Option>
        items={[]}
        getKey={(item) => item.id}
        isSelected={() => false}
        onSelect={vi.fn()}
        getPrimaryText={(item) => item.label}
        loading
      />
    );

    expect(screen.getByLabelText('general.loading')).toBeTruthy();
  });
});
