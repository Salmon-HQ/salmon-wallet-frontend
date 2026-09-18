/**
 * @vitest-environment jsdom
 *
 * The kit's on/off control: `role="switch"`, its checked state on
 * `aria-checked`, and a click flips it.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { Toggle } from './Toggle';

afterEach(cleanup);

describe('Toggle', () => {
  it('reads its checked state from `value`', () => {
    renderInMode(
      'dark',
      <Toggle testID="t" value onValueChange={() => {}} accessibilityLabel="Analytics" />
    );

    const toggle = screen.getByTestId('t');
    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('fires onValueChange with the flipped value on click', () => {
    const onValueChange = vi.fn();
    renderInMode(
      'dark',
      <Toggle
        testID="t"
        value={false}
        onValueChange={onValueChange}
        accessibilityLabel="Analytics"
      />
    );

    fireEvent.click(screen.getByTestId('t'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
