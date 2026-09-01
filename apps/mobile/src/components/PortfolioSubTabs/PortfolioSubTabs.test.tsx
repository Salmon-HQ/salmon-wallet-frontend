import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the FleshBackground test's convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

// The bubble is an animated touchable; no worklets runtime under Jest.
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
jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

import { PortfolioSubTabs } from './PortfolioSubTabs';

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

describe('PortfolioSubTabs', () => {
  it('calls onChange when an inactive tab is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent.press(getByTestId('portfolio-tab-nfts'));

    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('does not call onChange when the active tab is pressed again', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent.press(getByTestId('portfolio-tab-portfolio'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onVisibilityPress when the visibility button is pressed', () => {
    const onVisibilityPress = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={jest.fn()}
        onVisibilityPress={onVisibilityPress}
      />
    );

    fireEvent.press(getByTestId('portfolio-visibility-button'));

    expect(onVisibilityPress).toHaveBeenCalledTimes(1);
  });
});
