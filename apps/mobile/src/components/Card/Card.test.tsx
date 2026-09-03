/**
 * The card is the only thing standing between every screen and a hand-rolled
 * background/radius/hairline triple, so what it must not get wrong is the
 * tone→ground mapping and the press affordance.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { createSemantic, semantic } from '@salmon/shared';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { Card } from './Card';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('Card', () => {
  it('grounds on the thin-tier membrane by default and on the ink well when asked', () => {
    render(
      <>
        <Card testID="plain">
          <Text>a</Text>
        </Card>
        <Card testID="inked" tone="ink">
          <Text>b</Text>
        </Card>
      </>
    );

    expect(flatten(screen.getByTestId('plain').props.style).backgroundColor).toBe(
      semantic.surface.membraneThin
    );
    expect(flatten(screen.getByTestId('inked').props.style).backgroundColor).toBe(
      semantic.depth.abyss
    );
  });

  it('becomes a button only when it is given something to do', () => {
    const onPress = jest.fn();
    render(
      <>
        <Card testID="static">
          <Text>static</Text>
        </Card>
        <Card testID="pressable" onPress={onPress} accessibilityLabel="Open">
          <Text>pressable</Text>
        </Card>
      </>
    );

    expect(screen.getByTestId('static').props.accessibilityRole).toBeUndefined();
    fireEvent.press(screen.getByTestId('pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Open')).toBeTruthy();
  });

  it('announces as a link when it opens an external URL', () => {
    render(
      <Card
        testID="external"
        onPress={jest.fn()}
        accessibilityRole="link"
        accessibilityLabel="Docs"
      >
        <Text>external</Text>
      </Card>
    );

    expect(screen.getByTestId('external').props.accessibilityRole).toBe('link');
  });

  /**
   * The kit is what makes the mode switch reach a screen that has not been
   * migrated yet: every row on every screen is a `Card`, so if the card's
   * ground follows the mode, the screen does too. This is the assertion that
   * the tokens are read at render rather than captured at import — the whole
   * point of `useThemedStyles`.
   */
  it('grounds on the light card material when the mode is light', () => {
    const dark = renderWithTheme(
      <Card testID="dark">
        <Text>a</Text>
      </Card>,
      { mode: 'dark' }
    );
    const light = renderWithTheme(
      <Card testID="light">
        <Text>a</Text>
      </Card>,
      { mode: 'light' }
    );

    const darkGround = flatten(dark.getByTestId('dark').props.style).backgroundColor;
    const lightGround = flatten(light.getByTestId('light').props.style).backgroundColor;

    expect(darkGround).toBe(semantic.surface.membraneThin);
    expect(lightGround).toBe(createSemantic('light').surface.membraneThin);
    expect(lightGround).not.toBe(darkGround);
  });
});
