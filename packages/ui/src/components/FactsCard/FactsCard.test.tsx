/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { FactsCard } from './FactsCard';

afterEach(cleanup);

const ROWS = [
  { key: 'author', testID: 'fact-author', label: 'Made by', value: 'Salmon' },
  { key: 'networks', label: 'Networks', value: 'Solana' },
];

describe('FactsCard', () => {
  it('draws the title over every fact, in order', () => {
    renderInMode('dark', <FactsCard testID="facts" title="Loan" rows={ROWS} />);

    const card = screen.getByTestId('facts');
    expect(card.textContent).toBe('LoanMade bySalmonNetworksSolana');
  });

  it('is only the facts when it carries no title', () => {
    renderInMode('dark', <FactsCard testID="facts" rows={ROWS} />);

    expect(screen.getByTestId('facts').textContent).toBe('Made bySalmonNetworksSolana');
  });

  it('passes a row testID through, so a single fact can be selected', () => {
    renderInMode('dark', <FactsCard testID="facts" rows={ROWS} />);

    expect(screen.getByTestId('fact-author').textContent).toBe('Made bySalmon');
  });

  it('renders an empty card rather than nothing when it has no facts yet', () => {
    renderInMode('dark', <FactsCard testID="facts" title="Loan" rows={[]} />);

    expect(screen.getByTestId('facts').textContent).toBe('Loan');
  });
});
