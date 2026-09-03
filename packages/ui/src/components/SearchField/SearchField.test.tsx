/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { SearchField } from './SearchField';

afterEach(cleanup);

describe('SearchField', () => {
  it('draws the dark ground from the active tokens', () => {
    renderInMode(
      'dark',
      <SearchField testID="search" value="" onChangeText={() => {}} placeholder="Search" />
    );

    const input = screen.getByPlaceholderText('Search');
    expect(input.parentElement?.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.raised)
    );
  });

  it('takes the light ground when the mode is light', () => {
    const light = createSemantic('light').surface.raised;
    expect(light).not.toBe(createSemantic('dark').surface.raised);

    renderInMode(
      'light',
      <SearchField testID="search" value="" onChangeText={() => {}} placeholder="Search" />
    );
    expect(screen.getByPlaceholderText('Search').parentElement?.style.backgroundColor).toBe(
      asRenderedColor(light)
    );
  });

  it('uses the placeholder as the accessible name unless overridden', () => {
    renderInMode(
      'dark',
      <SearchField value="" onChangeText={() => {}} placeholder="Search tokens" />
    );
    expect(screen.getByRole('searchbox', { name: 'Search tokens' })).toBeTruthy();
  });

  it('overrides the accessible name with accessibilityLabel', () => {
    renderInMode(
      'dark',
      <SearchField
        value=""
        onChangeText={() => {}}
        placeholder="Search"
        accessibilityLabel="Filter powerups"
      />
    );
    expect(screen.getByRole('searchbox', { name: 'Filter powerups' })).toBeTruthy();
  });

  it('reports the typed value through onChangeText', () => {
    const onChangeText = vi.fn();
    renderInMode('dark', <SearchField value="" onChangeText={onChangeText} placeholder="Search" />);

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'sol' } });
    expect(onChangeText).toHaveBeenCalledWith('sol');
  });
});
