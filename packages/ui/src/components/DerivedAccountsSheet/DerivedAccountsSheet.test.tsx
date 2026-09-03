/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { DerivedAccountsSheet } from './DerivedAccountsSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && typeof options === 'object' ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('@salmon/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@salmon/shared');
  return { ...actual, useAccountsContext: () => [{ accounts: [{ id: 'a' }] }, {}] };
});

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

const FINDS = [
  { index: 1, address: 'Addr1111111111111111111111111111', balanceFormatted: '0.0500 SOL' },
  { index: 2, address: 'Addr2222222222222222222222222222', balanceFormatted: '1.2000 SOL' },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DerivedAccountsSheet', () => {
  it.each(['dark', 'light'] as const)('arrives with every find checked, in %s', (mode) => {
    stubMatchMedia();
    const onImport = vi.fn();

    renderInMode(
      mode,
      <DerivedAccountsSheet visible finds={FINDS} onImport={onImport} onDismiss={vi.fn()} />
    );

    // A funded path is almost always the user's own money; unchecking is
    // cheaper than hunting for the same accounts by hand.
    fireEvent.click(screen.getByTestId('derived-accounts-sheet-import'));
    expect(onImport).toHaveBeenCalledWith([1, 2]);
  });

  it('adds nothing until the user says so, and never names a derivation index', () => {
    stubMatchMedia();
    const onImport = vi.fn();

    renderInMode(
      'dark',
      <DerivedAccountsSheet visible finds={FINDS} onImport={onImport} onDismiss={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('derived-accounts-sheet-row-1'));
    expect(onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('derived-accounts-sheet-import'));
    expect(onImport).toHaveBeenCalledWith([2]);
  });

  it('treats an empty scan as a real answer, not as nothing at all', () => {
    stubMatchMedia();

    renderInMode(
      'dark',
      <DerivedAccountsSheet visible finds={[]} onImport={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByTestId('derived-accounts-sheet-empty')).toBeTruthy();
    expect(screen.queryByTestId('derived-accounts-sheet-import')).toBeNull();
  });

  it('answers "not now" through the same dismissal every other exit uses', () => {
    stubMatchMedia();
    const onDismiss = vi.fn();

    renderInMode(
      'dark',
      <DerivedAccountsSheet visible finds={FINDS} onImport={vi.fn()} onDismiss={onDismiss} />
    );

    fireEvent.click(screen.getByTestId('derived-accounts-sheet-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
