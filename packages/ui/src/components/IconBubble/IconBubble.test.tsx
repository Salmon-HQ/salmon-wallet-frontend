/**
 * @vitest-environment jsdom
 *
 * The bubble owns the ink: the tone decides both the ground and what is
 * drawn on it, and pressing it behaves like every other control.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { borderRadius, createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { IconBubble } from './IconBubble';

afterEach(cleanup);

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

describe('IconBubble', () => {
  it('takes its ground from the tone and its shape from the shape', () => {
    renderInMode(
      'dark',
      <>
        <IconBubble testID="circle" size={38} tone="surface" />
        <IconBubble testID="rounded" size={48} shape="rounded" tone="accent" />
      </>
    );

    const circle = screen.getByTestId('circle');
    expect(circle.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.raised)
    );
    expect(circle.style.borderRadius).toBe(`${borderRadius.full}px`);

    const rounded = screen.getByTestId('rounded');
    expect(rounded.style.backgroundColor).toBe(asRenderedColor(createSemantic('dark').accent.fill));
    expect(rounded.style.borderRadius).toBe(`${borderRadius.r4}px`);
  });

  it('draws the light ground when the mode is light', () => {
    renderInMode('light', <IconBubble testID="circle" size={38} tone="surface" />);
    expect(screen.getByTestId('circle').style.backgroundColor).toBe(
      asRenderedColor(createSemantic('light').surface.raised)
    );
  });

  it('paints a string child with the tone ink rather than leaving it default', () => {
    renderInMode(
      'dark',
      <IconBubble size={38} tone="accent-tint">
        A
      </IconBubble>
    );

    expect(screen.getByText('A').style.color).toBe(
      asRenderedColor(createSemantic('dark').accent.ink)
    );
  });

  it('hands the glyph the tone ink', () => {
    const Spy = vi.fn((_props: { size?: number; color?: string }) => null);
    renderInMode(
      'dark',
      <IconBubble testID="glyph" size={40} tone="ink" icon={Spy} iconSize={20} />
    );

    expect(Spy).toHaveBeenCalled();
    expect(Spy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ color: createSemantic('dark').text.primary })
    );
  });

  it('draws the outline tone as an edge with nothing behind it', () => {
    renderInMode('dark', <IconBubble testID="outline" size={42} tone="outline" />);

    const el = screen.getByTestId('outline');
    expect(el.style.backgroundColor).toBe('transparent');
    expect(el.style.borderColor).toBe(asRenderedColor(createSemantic('dark').border.raised));
  });

  it('stays an inert well with no button role while it has no onPress', () => {
    renderInMode(
      'dark',
      <IconBubble testID="well" size={44} tone="surface" accessibilityLabel="Token" />
    );

    expect(screen.getByTestId('well').tagName).toBe('DIV');
  });

  it('becomes a labelled button when given an onPress', () => {
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <IconBubble
        testID="send"
        size={42}
        tone="accent"
        onPress={onPress}
        accessibilityLabel="Send"
      />
    );

    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('swaps a disabled control to the crest ground instead of dimming the fill', () => {
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <IconBubble
        testID="send"
        size={42}
        tone="accent"
        onPress={onPress}
        disabled
        accessibilityLabel="Send"
      />
    );

    const button = screen.getByTestId('send');
    expect(button.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('dark').surface.crest)
    );
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('carries the flesh texture on every accent fill, pressable or not, and never on another ground', () => {
    renderInMode(
      'dark',
      <>
        <IconBubble testID="well" size={42} tone="accent" />
        <IconBubble testID="pressable" size={42} tone="accent" onPress={() => {}} />
        <IconBubble testID="surface" size={42} tone="surface" />
      </>
    );

    const flesh = screen.getByTestId('well').querySelectorAll('svg');
    expect(flesh.length).toBeGreaterThan(0);
    expect(screen.getByTestId('surface').querySelector('svg')).toBeNull();
  });

  it('is keyboard-operable and scales down while pressed', () => {
    stubMatchMedia(false);
    const onPress = vi.fn();
    renderInMode(
      'dark',
      <IconBubble
        testID="send"
        size={42}
        tone="accent"
        onPress={onPress}
        accessibilityLabel="Send"
      />
    );

    const button = screen.getByTestId('send');
    expect(button.style.transform).toBe('scale(1)');
    fireEvent.pointerDown(button);
    expect(button.style.transform).toBe('scale(0.985)');
    fireEvent.pointerUp(button);
    expect(button.style.transform).toBe('scale(1)');

    button.focus();
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('drops the press scale under reduced motion, and keeps the specular a step', () => {
    stubMatchMedia(true);
    renderInMode(
      'dark',
      <IconBubble
        testID="send"
        size={42}
        tone="accent"
        onPress={() => {}}
        accessibilityLabel="Send"
      />
    );

    const button = screen.getByTestId('send');
    fireEvent.pointerDown(button);
    expect(button.style.transform).toBe('scale(1)');

    const specular = screen.getByTestId('press-specular');
    expect(specular.style.transition).toBe('opacity 0ms cubic-bezier(0.32, 0.72, 0, 1)');
  });

  it('takes the smaller card corner when the frame asks for r12, and ignores it on a circle', () => {
    renderInMode(
      'dark',
      <>
        <IconBubble testID="xl" size={38} shape="rounded" tone="accent-tint" />
        <IconBubble testID="lg" size={38} shape="rounded" radius="lg" tone="accent-tint" />
        <IconBubble testID="pill" size={38} shape="circle" radius="lg" tone="accent-tint" />
      </>
    );

    expect(screen.getByTestId('xl').style.borderRadius).toBe(`${borderRadius.r4}px`);
    expect(screen.getByTestId('lg').style.borderRadius).toBe(`${borderRadius.r3}px`);
    expect(screen.getByTestId('pill').style.borderRadius).toBe(`${borderRadius.full}px`);
  });

  it('draws the bubble at the sizes the redesign uses, unscaled', () => {
    renderInMode('dark', <IconBubble testID="bubble" size={88} tone="surface" />);
    const el = screen.getByTestId('bubble');
    expect(el.style.width).toBe('88px');
    expect(el.style.height).toBe('88px');
  });
});
