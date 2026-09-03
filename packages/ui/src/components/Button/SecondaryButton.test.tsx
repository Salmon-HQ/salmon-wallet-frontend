/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { SecondaryButton } from './SecondaryButton';

afterEach(cleanup);

describe('SecondaryButton', () => {
  it('draws the outlined default tone', () => {
    renderInMode(
      'dark',
      <SecondaryButton testID="btn" onPress={() => {}}>
        Cancel
      </SecondaryButton>
    );
    const button = screen.getByTestId('btn');
    expect(button.style.backgroundColor).toBe('transparent');
    expect(button.style.borderColor).toBe(asRenderedColor(createSemantic('dark').border.raised));
  });

  it('takes the mode-specific edge and ink tokens', () => {
    renderInMode(
      'light',
      <SecondaryButton testID="light-btn" onPress={() => {}}>
        Cancel
      </SecondaryButton>
    );
    const light = createSemantic('light');
    const button = screen.getByTestId('light-btn');
    expect(button.style.borderColor).toBe(asRenderedColor(light.border.raised));
    expect(button.style.color).toBe(asRenderedColor(light.text.primary));
  });

  it('draws the danger-fill plane', () => {
    renderInMode(
      'dark',
      <SecondaryButton testID="btn" onPress={() => {}} tone="danger-fill">
        Delete
      </SecondaryButton>
    );
    const button = screen.getByTestId('btn');
    expect(button.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').status.dangerFill)
    );
  });

  it('fires onPress when clicked', () => {
    const onPress = vi.fn();
    renderInMode('dark', <SecondaryButton onPress={onPress}>Cancel</SecondaryButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is keyboard operable', () => {
    renderInMode('dark', <SecondaryButton onPress={() => {}}>Cancel</SecondaryButton>);
    const button = screen.getByRole('button', { name: 'Cancel' });
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
