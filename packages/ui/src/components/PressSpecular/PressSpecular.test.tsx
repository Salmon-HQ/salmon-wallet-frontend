/**
 * @vitest-environment jsdom
 *
 * The press specular on the DOM buttons (DESIGN.md §Shadow Vocabulary): a
 * 12% radial of `water.light` at the touch point, `screen` blend. `pressed`
 * now drives the opacity directly (no `styled`, no `:active` pseudo-selector)
 * so the assertions read the inline style instead of firing a real press.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PressSpecular, setSpecularOrigin } from './PressSpecular';

afterEach(cleanup);

describe('the press specular on the DOM buttons', () => {
  it('is transparent at rest and opaque while pressed', () => {
    const { rerender } = render(<PressSpecular pressed={false} reducedMotion={false} />);
    expect(screen.getByTestId('press-specular').style.opacity).toBe('0');

    rerender(<PressSpecular pressed reducedMotion={false} />);
    expect(screen.getByTestId('press-specular').style.opacity).toBe('0.12');
  });

  it('is decorative, never a hit target', () => {
    render(<PressSpecular pressed={false} reducedMotion={false} />);
    const layer = screen.getByTestId('press-specular');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.style.pointerEvents).toBe('none');
  });

  it('drops the opacity transition to a step under reduce motion', () => {
    render(<PressSpecular pressed={false} reducedMotion />);
    expect(screen.getByTestId('press-specular').style.transition).toContain('0ms');
  });

  it('records the touch point so the highlight centres on the pointer', () => {
    function Probe() {
      return (
        <button onPointerDown={setSpecularOrigin} data-testid="control">
          Send
        </button>
      );
    }
    render(<Probe />);
    const button = screen.getByTestId('control');
    fireEvent.pointerDown(button, { clientX: 42, clientY: 17 });

    // jsdom's rects are 0×0, so the point is the client coordinate itself.
    expect(button.style.getPropertyValue('--specular-x')).toBe('42px');
    expect(button.style.getPropertyValue('--specular-y')).toBe('17px');
  });
});
