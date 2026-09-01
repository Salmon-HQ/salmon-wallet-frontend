/**
 * The card is the only thing standing between every screen and a hand-rolled
 * background/radius/hairline triple, so what it must not get wrong is the
 * tone→ground mapping and the press affordance.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { semantic } from '@salmon/shared';
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
});
