/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { RevealCover } from './RevealCover';

afterEach(cleanup);

describe('RevealCover', () => {
  it('is an opaque bedrock button that names what it hides and reports the press', () => {
    const onPress = vi.fn();
    renderInMode('dark', <RevealCover label="Tap to reveal" onPress={onPress} testID="cover" />);
    const cover = screen.getByTestId('cover');
    expect(cover.tagName).toBe('BUTTON');
    expect(cover.getAttribute('aria-label')).toBe('Tap to reveal');
    expect(cover.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.bedrock)
    );
    fireEvent.click(cover);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the bedrock in light — the gate is never a scrim', () => {
    renderInMode('light', <RevealCover label="Tap to reveal" onPress={() => {}} testID="cover" />);
    expect(screen.getByTestId('cover').style.backgroundColor).toBe(
      asRenderedColor(createSemantic('light').surface.bedrock)
    );
  });
});
