/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FIELD_SHELL_CLASS, FIELD_SHELL_ERROR_CLASS } from './index';
import { PasswordInput } from '../components/PasswordInput';
import { SearchField } from '../components/SearchField';
import { TextInput } from '../components/TextInput';

afterEach(cleanup);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

/**
 * Focus is one rule in the global baseline, worn by whichever box owns a
 * field's shape. A field that stops wearing the class goes back to answering
 * focus its own way — the drift this class exists to end — and nothing else
 * would catch it, so it is asserted here.
 */
describe('every field wears the shared shell', () => {
  it.each([
    ['TextInput', <TextInput key="t" value="" onChangeText={() => {}} testID="field" />],
    ['PasswordInput', <PasswordInput key="p" value="" onChangeText={() => {}} testID="field" />],
    [
      'SearchField',
      <SearchField key="s" value="" onChangeText={() => {}} placeholder="Search" testID="field" />,
    ],
  ])('%s', (_name, element) => {
    const { container } = render(element);
    expect(container.querySelector(`.${FIELD_SHELL_CLASS}`)).toBeTruthy();
  });

  it('stands the accent edge down while the field is in error', () => {
    render(<TextInput value="" onChangeText={() => {}} error="nope" testID="field" />);
    const shell = screen.getByTestId('field').closest(`.${FIELD_SHELL_CLASS}`);
    expect(shell?.classList.contains(FIELD_SHELL_ERROR_CLASS)).toBe(true);
  });

  it('leaves the inner input unringed — the box around it is the ring’s subject', () => {
    render(<TextInput value="" onChangeText={() => {}} testID="field" />);
    const input = screen.getByTestId('field');
    expect(input.style.outline).toBe('none');
    expect(input.style.boxShadow).toBe('none');
  });
});
