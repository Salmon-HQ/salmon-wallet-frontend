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
vi.mock('../StatTile', () => ({ ...leaf('StatGrid'), ...leaf('StatTile') }));
vi.mock('../ProgressBar', () => leaf('ProgressBar'));
vi.mock('../Pill', () => leaf('Pill'));
vi.mock('../IconBubble', () => leaf('IconBubble'));
vi.mock('../TokenLogo', () => leaf('TokenLogo'));
vi.mock('../ListRow', () => ({
  ListRow: ({
    testID,
    title,
    trailing,
    trailingFill,
  }: {
    testID?: string;
    title: string;
    trailing?: React.ReactNode;
    trailingFill?: boolean;
  }) => (
    <div data-testid={testID} data-trailing-fill={String(!!trailingFill)}>
      {title}
      {trailing}
    </div>
  ),
}));
vi.mock('../Card', () => ({
  Card: ({ testID, children }: { testID?: string; children?: React.ReactNode }) => (
    <section data-testid={testID}>{children}</section>
  ),
}));
vi.mock('../../icons', () => ({ powerupIcons: {} }));

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
      expect(card.contains(screen.getByTestId(id))).toBe(true);
    }
    expect(screen.getByTestId('b-row').textContent).toContain('Solana Mobile Guardian');
    // A pill is centred in the row's end slot, both ways.
    expect(screen.getByTestId('b-row').dataset.trailingFill).toBe('true');
  });
});
