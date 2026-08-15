/**
 * The Scales Exclusion Rule, asserted rather than eyeballed.
 *
 * The motif used to tile across whole tabs and, on this card, across the
 * whole card — including behind the balance figure. It is now bound to the
 * logo group *by layout*: the field is a child of that group, so it is
 * structurally incapable of reaching the figure below no matter how the logo
 * or the type scale changes. These tests fail if someone reparents it back to
 * the card, or removes the gap that supplies the clearance.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// The real module pulls in @solana/kit, which jest-expo will not transform.
// Only the tokens this card reads are needed; `spacing.sm` is the value that
// supplies the clearance and is asserted below.
jest.mock('@salmon/shared', () => ({
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', selectedEdge: '#FF5C45' },
  },
  colors: {
    text: { primary: '#F6F8FB', balance: '#DDE3ED', muted: '#A7B1C4' },
    change: { positive: '#33D6A6', negative: '#FF6B85', neutral: '#8B96AD' },
    background: { glass: 'rgba(0, 0, 0, 0.4)' },
    step: { inactive: 'rgba(255, 255, 255, 0.3)' },
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, '2xl': 24 },
  borderRadius: { sm: 4, card: 26 },
  componentSizes: {
    blockchainIcon: 42,
    logoContainer: 48,
    eyeIcon: 20,
    changeArrowIcon: 14,
    buttonMinWidth: 120,
    buttonMinWidthLg: 200,
  },
  fontSize: { xs: 10, sm: 14, balance: 60 },
  fontWeight: { medium: '500', semibold: '600' },
  fontFamilyNative: { medium: 'Geist', semiBold: 'Geist' },
  letterSpacing: { wide: 0.3, balance: -0.245, change: 0 },
  opacity: { faint: 0.4 },
  shadows: {
    card: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    logo: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    balanceText: {
      shadowColor: '#000',
      shadowOffset: {},
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
  gradients: {
    balanceCardSolana: { colors: ['#212938', '#161C2D', '#10131C'], start: {}, end: {} },
  },
  hiddenValue: '••••',
  ms: (n: number) => n,
  s: (n: number) => n,
  vs: (n: number) => n,
  getLabelValue: (v: number) => (v >= 0 ? 'positive' : 'negative'),
  showPercentage: (v: number) => `${v}%`,
  getNetworkLabel: () => null,
  useCurrencyContext: () => [
    {},
    { formatValue: (v: number) => `$${v.toLocaleString('en-US')}`, formatChange: () => '+$61.45' },
  ],
}));

// Reanimated's native side is unavailable under jest-expo; the shimmer only
// renders while loading, which these cases never are.
jest.mock('../ShimmerRect', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { ShimmerRect: () => ReactActual.createElement(View) };
});

jest.mock('../ScalesBackground', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ScalesBackground: ({ variant = 'deepField' }: { variant?: string }) =>
      ReactActual.createElement(View, { testID: `scales-${variant}` }),
  };
});

import { BalanceCard } from './BalanceCard';

const LOGO_GROUP = 'balance-card-logo-group';

function renderCard() {
  return render(
    <BalanceCard
      network={{ id: 'solana-mainnet', name: 'Solana Mainnet' }}
      blockchain="solana"
      usdTotal={1234.56}
      changePercent={5.23}
      changeAmount={61.45}
    />
  );
}

describe('BalanceCard — the scales stay in the logo band', () => {
  it('draws exactly one field, at the deepField scale', () => {
    const { queryAllByTestId } = renderCard();

    expect(queryAllByTestId('scales-deepField')).toHaveLength(1);
    // The fish belongs to the primary CTA's salmon fill, never to a card.
    expect(queryAllByTestId('scales-fish')).toHaveLength(0);
  });

  it('mounts the field inside the logo group, not on the card', () => {
    const { getByTestId } = renderCard();
    const group = getByTestId(LOGO_GROUP);

    // Descendant of the group => its box is the group's box. This is the
    // whole guarantee; there is no measured constant to fall out of date.
    expect(group.findByProps({ testID: 'scales-deepField' })).toBeTruthy();
  });

  it('keeps the balance figure outside the field s box', () => {
    const { getByTestId, getByText } = renderCard();
    const group = getByTestId(LOGO_GROUP);
    const balance = getByText('$1,234');

    const groupIsAncestorOfBalance = (() => {
      let node = balance.parent;
      while (node) {
        if (node === group) return true;
        node = node.parent;
      }
      return false;
    })();

    expect(groupIsAncestorOfBalance).toBe(false);
  });

  it('clips the field to the logo group and clears the figure by the card gap', () => {
    const { getByTestId } = renderCard();
    const groupStyle = StyleSheet.flatten(getByTestId(LOGO_GROUP).props.style);

    // Even before the fade mask, the box cannot bleed past the band.
    expect(groupStyle.overflow).toBe('hidden');
    // ...and the band is the card's full width, so the motif reads as a band.
    expect(groupStyle.alignSelf).toBe('stretch');

    // The measured clearance between the field's bottom edge — where the fade
    // mask has already reached alpha 0 — and the top of the balance row is the
    // card's own gap between content groups. Read off the rendered card, not
    // recomputed, so shrinking the gap to zero fails here.
    const cardStyle = StyleSheet.flatten(getByTestId('balance-card-root').props.style);
    expect(cardStyle.gap).toBeGreaterThan(0);
  });
});
