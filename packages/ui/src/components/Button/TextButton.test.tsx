/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { TextButton } from './TextButton';

afterEach(cleanup);

describe('TextButton', () => {
  it('draws the accent ink with no background', () => {
    renderInMode(
      'dark',
      <TextButton testID="btn" onPress={() => {}}>
        Retry
      </TextButton>
    );
    const button = screen.getByTestId('btn');
    expect(button.style.background).toBe('transparent');
    expect(button.style.color).toBe(asRenderedColor(createSemantic('dark').text.accent));
  });

  it('takes different ink in each mode', () => {
    renderInMode(
      'dark',
      <TextButton testID="dark-btn" onPress={() => {}}>
        Retry
      </TextButton>
    );
    const darkInk = screen.getByTestId('dark-btn').style.color;
    cleanup();

    renderInMode(
      'light',
      <TextButton testID="light-btn" onPress={() => {}}>
        Retry
      </TextButton>
    );
    const lightInk = screen.getByTestId('light-btn').style.color;

    expect(lightInk).not.toBe(darkInk);
  });

  it('takes a custom color override', () => {
    renderInMode(
      'dark',
      <TextButton testID="btn" onPress={() => {}} color="#ff0000">
        Delete
      </TextButton>
    );
    expect(screen.getByTestId('btn').style.color).toBe(asRenderedColor('#ff0000'));
  });

  it('fires onPress when clicked', () => {
    const onPress = vi.fn();
    renderInMode('dark', <TextButton onPress={onPress}>Retry</TextButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is keyboard operable', () => {
    renderInMode('dark', <TextButton onPress={() => {}}>Retry</TextButton>);
    const button = screen.getByRole('button', { name: 'Retry' });
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});
