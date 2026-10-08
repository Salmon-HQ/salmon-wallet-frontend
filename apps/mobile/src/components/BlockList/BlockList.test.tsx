import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { KitBlock } from '@salmon/shared';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
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
  return { PriceChart: () => <Text testID="b-chart">PriceChart</Text> };
});
jest.mock('../SectionLabel', () => leaf('SectionLabel')());
jest.mock('../SkeletonRow', () => leaf('SkeletonRow')());
jest.mock('../StateBlock', () => leaf('StateBlock')());
jest.mock('../TokenList', () => leaf('TokenListItem')());

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
  });
});
