/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockLogic = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual<object>('@salmon/shared/src/theme')),
}));
vi.mock('@salmon/shared/powerups', async () => ({
  useSkrScreenLogic: (params: unknown) => mockLogic(params),
  skrBlocks: (
    await vi.importActual<typeof import('@salmon/shared/src/powerups/skr/skrBlocks')>(
      '@salmon/shared/src/powerups/skr/skrBlocks'
    )
  ).skrBlocks,
}));
vi.mock('../FactsCard', () => ({
  FactsCard: ({
    title,
    rows,
    testID,
  }: {
    title?: string;
    rows: { key: string }[];
    testID?: string;
  }) => <div data-testid={testID}>{`${title ?? ''}:${rows.map((r) => r.key).join(',')}`}</div>,
}));
vi.mock('../StateBlock', () => ({
  StateBlock: ({
    title,
    testID,
    onRetry,
  }: {
    title: string;
    testID?: string;
    onRetry?: () => void;
  }) => (
    <button data-testid={testID} onClick={onRetry}>
      {title}
    </button>
  ),
}));
vi.mock('../SectionLabel', () => ({
  SectionLabel: ({ children }: { children: string }) => <h3>{children}</h3>,
}));
vi.mock('../TokenList', () => ({ TokenListItem: () => null }));
vi.mock('../SkeletonRow', () => ({ SkeletonRow: () => <div data-testid="skeleton" /> }));

import { SkrPage } from './SkrPage';

const ready = {
  state: 'ready',
  summary: [{ key: 'liquid' }, { key: 'staked' }],
  history: [{ key: 'h-1' }],
  refresh: vi.fn(),
};

afterEach(cleanup);

describe('SkrPage', () => {
  it('shows the facts and the rewards of the owner it is given', () => {
    mockLogic.mockReturnValue(ready);
    render(<SkrPage publicKey="Owner" />);

    expect(mockLogic).toHaveBeenCalledWith({ publicKey: 'Owner' });
    expect(screen.getByTestId('skr-facts').textContent).toBe('skr.facts.title:liquid,staked');
    expect(screen.getByTestId('skr-history').textContent).toBe(':h-1');
  });

  it('explains an empty history', () => {
    mockLogic.mockReturnValue({ ...ready, history: [] });
    render(<SkrPage publicKey="Owner" />);

    expect(screen.getByText('skr.history.empty')).toBeTruthy();
  });

  it('waits with skeletons, never a spinner', () => {
    mockLogic.mockReturnValue({ ...ready, state: 'loading' });
    render(<SkrPage publicKey="Owner" />);

    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('offers a retry when the read failed', () => {
    const refresh = vi.fn();
    mockLogic.mockReturnValue({ ...ready, state: 'error', refresh });
    render(<SkrPage publicKey="Owner" />);

    fireEvent.click(screen.getByTestId('skr-error'));

    expect(refresh).toHaveBeenCalled();
  });

  it('says so when the wallet has no SKR', () => {
    mockLogic.mockReturnValue({ ...ready, state: 'empty' });
    render(<SkrPage publicKey="Owner" />);

    expect(screen.getByText('skr.empty.title')).toBeTruthy();
  });
});
