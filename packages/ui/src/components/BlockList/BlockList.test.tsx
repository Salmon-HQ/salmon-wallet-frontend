/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KitBlock } from '@salmon/shared';

const { leaf } = vi.hoisted(() => ({
  leaf: (name: string) => ({
    [name]: ({ testID }: { testID?: string }) => <div data-testid={testID}>{name}</div>,
  }),
}));
vi.mock('../FactsCard', () => leaf('FactsCard'));
vi.mock('../PriceChart', () => ({ PriceChart: () => <div>PriceChart</div> }));
vi.mock('../SectionLabel', () => leaf('SectionLabel'));
vi.mock('../SkeletonRow', () => leaf('SkeletonRow'));
vi.mock('../StateBlock', () => leaf('StateBlock'));
vi.mock('../TokenList', () => leaf('TokenListItem'));

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

afterEach(cleanup);

describe('BlockList', () => {
  it('draws each block with its own kit component, in order', () => {
    render(<BlockList testID="list" blocks={blocks} />);

    const order = Array.from(screen.getByTestId('list').children).map((el) => el.textContent);
    expect(order).toEqual([
      'SectionLabel',
      'FactsCard',
      'TokenListItem',
      'StateBlock',
      'SkeletonRow',
      'PriceChart',
    ]);
  });
});
