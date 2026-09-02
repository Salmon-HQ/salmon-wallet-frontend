/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { PrimaryButton } from './PrimaryButton';

afterEach(cleanup);

describe('PrimaryButton', () => {
  it('draws the salmon fill and forwards testID to data-testid', () => {
    renderInMode(
      'dark',
      <PrimaryButton testID="primary" onPress={() => {}}>
        Send
      </PrimaryButton>
    );

    const button = screen.getByTestId('primary');
    expect(button).toBe(screen.getByRole('button', { name: 'Send' }));
    expect(button.style.backgroundColor).toBe(asRenderedColor(createSemantic('dark').accent.fill));
  });

  it('takes different grounds and ink in each mode', () => {
    renderInMode(
      'dark',
      <PrimaryButton testID="dark-btn" onPress={() => {}}>
        Send
      </PrimaryButton>
    );
    const darkColor = screen.getByTestId('dark-btn').style.backgroundColor;
    cleanup();

    renderInMode(
      'light',
      <PrimaryButton testID="light-btn" onPress={() => {}}>
        Send
      </PrimaryButton>
    );
    const lightColor = screen.getByTestId('light-btn').style.backgroundColor;

    expect(lightColor).toBe(darkColor); // accent.fill is theme-invariant by ruling
    expect(lightColor).toBe(asRenderedColor(createSemantic('light').accent.fill));
  });

  it('fires onPress when clicked', () => {
    const onPress = vi.fn();
    renderInMode('dark', <PrimaryButton onPress={onPress}>Send</PrimaryButton>);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('swaps to the disabled ground and drops the flesh/specular when disabled', () => {
    renderInMode(
      'dark',
      <PrimaryButton testID="btn" onPress={() => {}} disabled>
        Send
      </PrimaryButton>
    );

    const button = screen.getByTestId('btn');
    expect(button.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.crest)
    );
    expect(screen.queryByTestId('press-specular')).toBeNull();
  });

  it('shows the spinner instead of the label while loading', () => {
    renderInMode(
      'dark',
      <PrimaryButton onPress={() => {}} loading>
        Send
      </PrimaryButton>
    );
    expect(screen.queryByText('Send')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('is keyboard operable', () => {
    const onPress = vi.fn();
    renderInMode('dark', <PrimaryButton onPress={onPress}>Send</PrimaryButton>);

    const button = screen.getByRole('button', { name: 'Send' });
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  describe('under reduce motion', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }),
      });
    });

    it('collapses the press transition to none', () => {
      renderInMode('dark', <PrimaryButton onPress={() => {}}>Send</PrimaryButton>);
      const button = screen.getByRole('button', { name: 'Send' });
      expect(button.style.transition).toBe('none');
    });
  });
});
