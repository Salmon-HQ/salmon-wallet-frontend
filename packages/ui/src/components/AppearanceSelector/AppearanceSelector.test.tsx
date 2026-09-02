/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { AppearanceSelector } from './AppearanceSelector';

afterEach(cleanup);

describe('AppearanceSelector', () => {
  it('lists the three preferences, marks the active one and reports a pick', () => {
    const onSelectPreference = vi.fn();
    renderInMode(
      'dark',
      <AppearanceSelector
        activePreference="system"
        onSelectPreference={onSelectPreference}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId('appearance-option-system')).toBeTruthy();
    expect(screen.getByTestId('appearance-option-light')).toBeTruthy();
    expect(screen.getByTestId('appearance-option-dark')).toBeTruthy();

    fireEvent.click(screen.getByTestId('appearance-option-light'));
    expect(onSelectPreference).toHaveBeenCalledWith('light');
  });
});
