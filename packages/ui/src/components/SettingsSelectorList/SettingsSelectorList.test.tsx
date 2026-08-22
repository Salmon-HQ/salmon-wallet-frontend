/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse, so the module is stubbed with the runtime-agnostic theme tokens.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
}));

import { SettingsSelectorList } from './SettingsSelectorList';

afterEach(cleanup);

type Option = { id: string; label: string };

const OPTIONS: Option[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
];

function renderList(selectedId: string, onSelect = vi.fn()) {
  render(
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

describe('SettingsSelectorList — selected state is announced', () => {
  it('exposes the rows as options of a listbox', () => {
    renderList('en');

    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  it('marks only the active option as selected', () => {
    renderList('es');

    expect(screen.getByRole('option', { name: 'Spanish', selected: true })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'English', selected: false })).toBeTruthy();
  });

  it('still selects an option when it is activated', () => {
    const onSelect = renderList('en');

    fireEvent.click(screen.getByRole('option', { name: 'Spanish' }));

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it('names the loading indicator', () => {
    render(
      <SettingsSelectorList<Option>
        items={[]}
        getKey={(item) => item.id}
        isSelected={() => false}
        onSelect={vi.fn()}
        getPrimaryText={(item) => item.label}
        loading
      />
    );

    expect(screen.getByRole('progressbar', { name: 'general.loading' })).toBeTruthy();
  });
});
