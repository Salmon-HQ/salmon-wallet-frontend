/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { Card } from './Card';

afterEach(cleanup);

describe('Card', () => {
  it('draws the dark ground from the active tokens', () => {
    renderInMode('dark', <Card testID="card">content</Card>);

    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
    expect(card.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.membraneThin)
    );
  });

  it('takes the light ground when the mode is light', () => {
    const light = createSemantic('light').surface.membraneThin;
    expect(light).not.toBe(createSemantic('dark').surface.membraneThin);

    renderInMode('light', <Card testID="card">content</Card>);
    expect(screen.getByTestId('card').style.backgroundColor).toBe(asRenderedColor(light));
  });

  it('becomes a button and fires when pressed', () => {
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <Card testID="card" onPress={onPress} accessibilityLabel="Open">
        content
      </Card>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dims while pressed and returns on release', () => {
    renderInMode('dark', <Card testID="card" onPress={() => {}} />);
    const card = screen.getByTestId('card');

    expect(card.style.opacity).toBe('1');
    fireEvent.pointerDown(card);
    expect(card.style.opacity).toBe('0.7');
    fireEvent.pointerUp(card);
    expect(card.style.opacity).toBe('1');
  });

  it('announces as a link when the press opens a URL', () => {
    renderInMode(
      'dark',
      <Card onPress={() => {}} accessibilityRole="link" accessibilityLabel="Explorer" />
    );
    expect(screen.getByRole('link', { name: 'Explorer' })).toBeTruthy();
  });
});
