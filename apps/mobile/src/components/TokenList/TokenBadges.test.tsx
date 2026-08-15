/**
 * The badge rules, asserted: a cap of two, a risk tag that can never be the
 * collapsed one, and an accessible name on every chip. A row used to render
 * five saturated unlabelled chips; each of these fails if that comes back.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  semantic: {
    text: { tertiary: '#8B96AD' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)' },
  },
  spacing: { xxs: 2, xs: 4 },
  borderRadius: { sm: 4 },
  componentSizes: { iconSizeXSmall: 18 },
  fontSize: { xs: 10 },
  fontWeight: { semibold: '600' },
  fontFamilyNative: { semiBold: 'Geist' },
  ms: (n: number) => n,
  s: (n: number) => n,
  vs: (n: number) => n,
}));

jest.mock('react-i18next', () => ({
  // Mirrors i18next's (key, fallback) signature; the real keys exist in both
  // locales, so the fallback is what a test asserts against.
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import TokenBadges from './TokenBadges';

describe('TokenBadges', () => {
  it('renders nothing without tags', () => {
    expect(render(<TokenBadges tags={[]} />).toJSON()).toBeNull();
    expect(render(<TokenBadges tags={undefined} />).toJSON()).toBeNull();
  });

  it('renders nothing when no tag is drawable', () => {
    expect(render(<TokenBadges tags={['not-a-real-tag']} />).toJSON()).toBeNull();
  });

  it('caps at two inline chips and collapses the rest into +N', () => {
    const { queryByTestId, getByTestId } = render(
      <TokenBadges tags={['community', 'verified', 'birdeye-trending', 'lst']} />
    );

    expect(queryByTestId('token-badge-verified')).not.toBeNull();
    expect(queryByTestId('token-badge-community')).not.toBeNull();
    expect(queryByTestId('token-badge-birdeye-trending')).toBeNull();
    expect(getByTestId('token-badge-overflow')).toBeTruthy();
  });

  it('never collapses a risk tag — signals sort to the front', () => {
    const { queryByTestId } = render(
      <TokenBadges tags={['community', 'lst', 'stable', 'deprecated']} />
    );

    expect(queryByTestId('token-badge-deprecated')).not.toBeNull();
  });

  it('gives every chip an accessible name, and announces the collapsed ones', () => {
    const { getByTestId } = render(
      <TokenBadges tags={['verified', 'community', 'birdeye-trending', 'lst']} />
    );

    expect(getByTestId('token-badge-verified').props.accessibilityLabel).toBe('Verified');
    expect(getByTestId('token-badge-verified').props.accessibilityRole).toBe('image');
    expect(getByTestId('token-badge-overflow').props.accessibilityLabel).toBe('Trending, LST');
  });

  it('spends colour only on signals; descriptive tags stay monochrome', () => {
    const { getByTestId } = render(<TokenBadges tags={['verified', 'community']} />);

    // The icon is the chip's only child element; its `color` is the ink.
    const inkOf = (testID: string) => {
      const [icon] = getByTestId(testID).children as { props: { color: string } }[];
      return icon.props.color;
    };

    expect(inkOf('token-badge-verified')).toBe('#33D6A6');
    expect(inkOf('token-badge-community')).toBe('#8B96AD');
  });

  it('does not let an unknown tag consume an inline slot', () => {
    const { queryByTestId } = render(
      <TokenBadges tags={['not-a-real-tag', 'verified', 'community']} />
    );

    expect(queryByTestId('token-badge-verified')).not.toBeNull();
    expect(queryByTestId('token-badge-community')).not.toBeNull();
    expect(queryByTestId('token-badge-overflow')).toBeNull();
  });
});
