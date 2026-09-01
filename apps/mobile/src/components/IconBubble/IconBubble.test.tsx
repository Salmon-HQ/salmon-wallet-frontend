/**
 * The bubble owns the ink. A call site that could pass its own colour would
 * eventually pass one that fails on the ground it sits on, so what this pins
 * is that the tone decides both halves — and, since the bubble became the
 * repo's only circular control, that pressing it behaves like every other
 * control rather than like a `View` that happens to take a tap.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

// No worklets runtime in Jest: the animated touchable and the press hook need
// plain-JS stand-ins (same shape as the PowerupsFab suite's).
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

jest.mock('../PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

import { borderRadius, borderWidth, semantic } from '@salmon/shared';
import { IconBubble } from './IconBubble';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('IconBubble', () => {
  it('takes its ground from the tone and its shape from the shape', () => {
    render(
      <>
        <IconBubble testID="circle" size={38} tone="surface" />
        <IconBubble testID="rounded" size={48} shape="rounded" tone="accent" />
      </>
    );

    const circle = flatten(screen.getByTestId('circle').props.style);
    expect(circle.backgroundColor).toBe(semantic.surface.raised);
    expect(circle.borderRadius).toBe(borderRadius.full);

    const rounded = flatten(screen.getByTestId('rounded').props.style);
    expect(rounded.backgroundColor).toBe(semantic.accent.fill);
    expect(rounded.borderRadius).toBe(borderRadius.r4);
  });

  it('paints a string child with the tone ink rather than leaving it default', () => {
    render(
      <IconBubble testID="initial" size={38} tone="accent-tint">
        A
      </IconBubble>
    );

    expect(flatten(screen.getByText('A').props.style).color).toBe(semantic.accent.ink);
  });

  it('hands the glyph the tone ink', () => {
    const Spy = jest.fn((_props: { size?: number; color?: string }) => null);
    render(<IconBubble testID="glyph" size={40} tone="ink" icon={Spy} iconSize={20} />);

    expect(Spy).toHaveBeenCalled();
    expect(Spy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ color: semantic.text.primary })
    );
  });

  it('draws the outline tone as an edge with nothing behind it', () => {
    render(<IconBubble testID="outline" size={42} tone="outline" />);

    const style = flatten(screen.getByTestId('outline').props.style);
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderColor).toBe(semantic.border.raised);
    expect(style.borderWidth).toBe(borderWidth.actionButton);
  });

  it('stays an inert well with no role while it has no onPress', () => {
    render(<IconBubble testID="well" size={44} tone="surface" accessibilityLabel="Token" />);

    expect(screen.getByTestId('well').props.accessibilityRole).toBeUndefined();
  });

  it('becomes a labelled button when given an onPress', () => {
    const onPress = jest.fn();
    render(
      <IconBubble
        testID="send"
        size={42}
        tone="accent"
        onPress={onPress}
        accessibilityLabel="Send"
      />
    );

    const button = screen.getByTestId('send');
    expect(button.props.accessibilityRole).toBe('button');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('swaps a disabled control to the crest ground instead of dimming the fill', () => {
    const onPress = jest.fn();
    render(
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
    expect(flatten(button.props.style).backgroundColor).toBe(semantic.surface.crest);
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('takes the smaller card corner when the frame asks for r12', () => {
    render(
      <>
        <IconBubble testID="xl" size={38} shape="rounded" tone="accent-tint" />
        <IconBubble testID="lg" size={38} shape="rounded" radius="lg" tone="accent-tint" />
        <IconBubble testID="pill" size={38} shape="circle" radius="lg" tone="accent-tint" />
      </>
    );

    expect(flatten(screen.getByTestId('xl').props.style).borderRadius).toBe(borderRadius.r4);
    expect(flatten(screen.getByTestId('lg').props.style).borderRadius).toBe(borderRadius.r3);
    // A circle ignores the corner entirely.
    expect(flatten(screen.getByTestId('pill').props.style).borderRadius).toBe(borderRadius.full);
  });

  it('lets a call site quiet the glyph without changing the tone, but never on a disabled control', () => {
    const Spy = jest.fn((_props: { color?: string }) => null);
    render(
      <IconBubble
        testID="quiet"
        size={36}
        tone="outline"
        icon={Spy}
        iconColor={semantic.text.secondary}
      />
    );
    expect(Spy.mock.calls[0]?.[0].color).toBe(semantic.text.secondary);

    const DisabledSpy = jest.fn((_props: { color?: string }) => null);
    render(
      <IconBubble
        testID="off"
        size={36}
        tone="outline"
        icon={DisabledSpy}
        iconColor={semantic.text.secondary}
        onPress={() => {}}
        disabled
      />
    );
    // A disabled control is one object — the override does not survive it.
    expect(DisabledSpy.mock.calls[0]?.[0].color).toBe(semantic.text.disabled);
  });
});
