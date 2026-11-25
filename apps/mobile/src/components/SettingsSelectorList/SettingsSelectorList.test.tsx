/**
 * The single-choice list of Settings: a row with no art of its own carries a
 * well with its short code, unless the selector asks for the text alone.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () =>
  require('../../../test-utils/sharedWith').sharedWith({
    ...jest.requireActual('../../../test-utils/themeTokens'),
  })
);

// IconBubble pulls a native module jest cannot load (same stand-in as `IconBubble.test.tsx`).
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
    Easing: { bezier: () => (value: number) => value },
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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { SettingsSelectorList } from './SettingsSelectorList';

const OPTIONS = [{ id: 'en', label: 'English' }];

const list = (renderLeadingElement?: () => null) => (
  <SettingsSelectorList
    items={OPTIONS}
    getKey={(item) => item.id}
    isSelected={() => false}
    onSelect={jest.fn()}
    getPrimaryText={(item) => item.label}
    renderLeadingElement={renderLeadingElement}
  />
);

describe('SettingsSelectorList', () => {
  it('carries a well with the short code when the selector gives no art', () => {
    render(list());

    expect(screen.getByText('EN')).toBeTruthy();
  });

  it('draws the text alone when the selector asks for no well', () => {
    render(list(() => null));

    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.queryByText('EN')).toBeNull();
  });
});
