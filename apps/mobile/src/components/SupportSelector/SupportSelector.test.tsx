/**
 * Support rows leave the app, and the glyph has to say so.
 *
 * The right-pointing caret is the promise of a lateral slide — an affordance
 * internal navigation no longer keeps, and one these rows never earned: every
 * one of them hands off to a browser or a mail client. They keep an
 * affordance, but the external-link glyph, not the navigation caret.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// The theme folder imports nothing but itself, so the real tokens can be
// pulled in directly — the barrel would drag in `@solana/kit`, which
// jest-expo does not transform. See `test-utils/themeTokens.ts`.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../SettingsScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

// No worklets runtime in Jest: `ListRow`'s leading `IconBubble` needs the
// same plain-JS stand-ins as the IconBubble suite itself.
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

import { SupportSelector } from './SupportSelector';

const OPTIONS = [
  { id: 'faq', title: 'settings.faq', description: 'settings.faq_desc', url: 'https://x/faq' },
  { id: 'email', title: 'settings.email', description: 'settings.email_desc', url: 'mailto:a@b.c' },
] as any;

function renderSelector() {
  return render(<SupportSelector options={OPTIONS} onOpenLink={jest.fn()} onBack={jest.fn()} />);
}

describe('SupportSelector', () => {
  it('carries no navigation caret', () => {
    const { CaretRightIcon } = jest.requireActual('../../icons');

    expect(renderSelector().UNSAFE_queryAllByType(CaretRightIcon)).toHaveLength(0);
  });

  it('marks every row as leaving the app', () => {
    const { ArrowSquareOutIcon } = jest.requireActual('../../icons');

    expect(renderSelector().UNSAFE_queryAllByType(ArrowSquareOutIcon)).toHaveLength(OPTIONS.length);
  });

  // Nothing on this screen commits, so nothing on it spends the accent. The
  // row glyphs take the quiet ink the settings rows take.
  it('draws row glyphs in the quiet ink, not the accent', () => {
    const { semantic } = jest.requireActual('../../../test-utils/themeTokens');
    const { QuestionIcon, EnvelopeIcon } = jest.requireActual('../../icons');
    const tree = renderSelector();

    for (const Glyph of [QuestionIcon, EnvelopeIcon]) {
      const [node] = tree.UNSAFE_getAllByType(Glyph);
      expect(node.props.color).toBe(semantic.text.primary);
      expect(node.props.color).not.toBe(semantic.accent.ink);
    }
  });
});
