import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { KitBlock } from '@salmon/shared';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  ...jest.requireActual('@salmon/shared/src/kit/createBlockList'),
  s: (value: number) => value,
  vs: (value: number) => value,
}));
const leaf = (name: string) => () => {
  const { Text } = jest.requireActual('react-native');
  return { [name]: ({ testID }: { testID?: string }) => <Text testID={testID}>{name}</Text> };
};
jest.mock('../FactsCard', () => leaf('FactsCard')());
jest.mock('../PriceChart', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PriceChart: ({ bleed }: { bleed?: boolean }) => (
      <Text testID="b-chart" accessibilityHint={bleed ? 'bleed' : 'inset'}>
        PriceChart
      </Text>
    ),
  };
});
jest.mock('../SectionLabel', () => leaf('SectionLabel')());
jest.mock('../SkeletonRow', () => leaf('SkeletonRow')());
jest.mock('../StateBlock', () => leaf('StateBlock')());
jest.mock('../TokenList', () => leaf('TokenListItem')());
jest.mock('../StatTile', () => leaf('StatGrid')());
jest.mock('../ProgressBar', () => leaf('ProgressBar')());
jest.mock('../BarChart', () => leaf('BarChart')());
jest.mock('../Button', () => leaf('SecondaryButton')());
jest.mock('../ListRow', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ListRow: ({
      testID,
      title,
      trailing,
    }: {
      testID?: string;
      title: string;
      trailing?: unknown;
    }) => (
      <>
        <Text testID={testID}>{title}</Text>
        {trailing as never}
      </>
    ),
  };
});
jest.mock('../Card', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Card: ({ testID, children }: { testID?: string; children?: unknown }) => (
      <View testID={testID}>{children as never}</View>
    ),
  };
});
jest.mock('../IconBubble', () => leaf('IconBubble')());
jest.mock('../TokenLogo', () => leaf('TokenLogo')());
jest.mock('../Pill', () => leaf('Pill')());
jest.mock('../../icons', () => ({ powerupIcons: {} }));

import { BlockList } from './BlockList';

const blocks: KitBlock[] = [
  { kind: 'label', key: 'l', props: { testID: 'b-label', variant: 'title', children: 'Staking' } },
  { kind: 'facts', key: 'f', props: { testID: 'b-facts', rows: [] } },
  {
    kind: 'token',
    key: 't',
    props: { testID: 'b-token', token: { address: 'a', name: 'n', symbol: 's', uiAmount: 1 } },
  },
  { kind: 'state', key: 's', props: { testID: 'b-state', tone: 'empty', title: 'x' } },
  { kind: 'skeleton', key: 'k', props: { testID: 'b-skeleton' } },
  {
    kind: 'chart',
    key: 'c',
    props: { data: [], selectedPeriod: '1M', onPeriodChange: () => {} },
  },
  { kind: 'bars', key: 'b', props: { testID: 'b-bars', values: [1, 2], accessibilityLabel: 'x' } },
  {
    kind: 'button',
    key: 'u',
    props: { testID: 'b-button', children: 'See all', onPress: () => {} },
  },
];

describe('BlockList', () => {
  it('draws each block with its own kit component, in order', () => {
    render(<BlockList testID="list" blocks={blocks} />);

    expect(screen.getByTestId('b-label').props.children).toBe('SectionLabel');
    expect(screen.getByTestId('b-facts').props.children).toBe('FactsCard');
    expect(screen.getByTestId('b-token').props.children).toBe('TokenListItem');
    expect(screen.getByTestId('b-state').props.children).toBe('StateBlock');
    expect(screen.getByTestId('b-skeleton').props.children).toBe('SkeletonRow');
    expect(screen.getByTestId('b-chart').props.children).toBe('PriceChart');
    expect(screen.getByTestId('b-bars').props.children).toBe('BarChart');
    expect(screen.getByTestId('b-button').props.children).toBe('SecondaryButton');
    // The token screen's chart: off the left edge, a gutter short of the right.
    expect(screen.getByTestId('b-chart').props.accessibilityHint).toBe('bleed');
  });
});

describe('BlockList — composed blocks', () => {
  it("nests a card's own blocks inside it, with rows, figures, dividers and bars", () => {
    render(
      <BlockList
        blocks={[
          {
            kind: 'card',
            key: 'card',
            props: { testID: 'b-card' },
            blocks: [
              { kind: 'stats', key: 'st', props: { testID: 'b-stats', items: [] } },
              { kind: 'divider', key: 'd' },
              {
                kind: 'row',
                key: 'r',
                props: {
                  testID: 'b-row',
                  leading: { icon: 'ShieldCheck' },
                  title: 'Solana Mobile Guardian',
                  pill: { testID: 'b-pill', label: 'Active', tone: 'success' },
                },
              },
              {
                kind: 'progress',
                key: 'p',
                props: { testID: 'b-progress', value: 0.7, accessibilityLabel: 'x' },
              },
            ],
          },
        ]}
      />
    );

    const card = screen.getByTestId('b-card');
    for (const id of ['b-stats', 'b-row', 'b-pill', 'b-progress']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(card.findAllByProps({ testID: 'b-stats' }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('b-row').props.children).toBe('Solana Mobile Guardian');
  });
});
