/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { DerivedAccountCard } from './DerivedAccountCard';
import { DerivedAccountCardSkeleton } from './DerivedAccountCardSkeleton';

afterEach(cleanup);

describe('DerivedAccountCard', () => {
  it('says which card is chosen, and takes the light ground in light', () => {
    renderInMode(
      'light',
      <DerivedAccountCard
        testID="card"
        address="FakeAddress1111"
        networkName="Solana"
        path="m/44'/501'/1'/0'"
        balanceFormatted="$1.00"
        selected
        dimmed={false}
        onToggle={() => {}}
        blockchain="solana"
      />
    );

    const card = screen.getByTestId('card');
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('light').surface.raised)
    );
  });
});

describe('DerivedAccountCardSkeleton', () => {
  it('stands in with the card’s own ground, so the swap does not jump', () => {
    const { container } = renderInMode('dark', <DerivedAccountCardSkeleton />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.backgroundColor).toBe(asRenderedColor(createSemantic('dark').surface.raised));
  });
});
