/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The real `@salmon/shared` barrel reaches React Native modules that Vite
// cannot parse; only design tokens are needed here.
vi.mock('@salmon/shared', () => ({
  borderRadius: { lg: 16 },
  fontSize: { xs: 10, sm: 12 },
  fontWeight: { semibold: 600 },
  spacing: { xs: 4, sm: 8 },
  semantic: {
    surface: { crest: '#12161f' },
    border: { raised: '#6b7793' },
    text: { secondary: '#c7d3e8', tertiary: '#98a4bd' },
    status: { success: '#33D6A6', danger: '#ef4444', warning: '#ffab00' },
  },
}));

import { PendingActivityBanner } from './PendingActivityBanner';
import type { PendingActivityBannerProps } from './types';

const item = (
  overrides: Partial<PendingActivityBannerProps['items'][number]> = {}
): PendingActivityBannerProps['items'][number] => ({
  id: 'sig-1',
  kind: 'swap',
  status: 'pending',
  detail: '1 SOL → 210 USDC',
  dismissible: true,
  ...overrides,
});

describe('PendingActivityBanner', () => {
  afterEach(cleanup);

  it('renders nothing when there is nothing in flight', () => {
    const { container } = render(<PendingActivityBanner items={[]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('labels each outcome, so state is never carried by colour alone', () => {
    render(
      <PendingActivityBanner
        items={[
          item({ id: 'a', status: 'pending' }),
          item({ id: 'b', kind: 'send', status: 'confirmed' }),
          item({ id: 'c', kind: 'send', status: 'failed' }),
          item({ id: 'd', kind: 'swap', status: 'expired' }),
        ]}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText('pending.swap.pending')).toBeTruthy();
    expect(screen.getByText('pending.send.confirmed')).toBeTruthy();
    expect(screen.getByText('pending.send.failed')).toBeTruthy();
    expect(screen.getByText('pending.swap.expired')).toBeTruthy();
    // Expiry means nothing was spent — the row says so rather than leaving the
    // user to guess whether their funds moved.
    expect(screen.getByText('pending.expiredHint')).toBeTruthy();
  });

  it('offers dismissal only once an entry has resolved', () => {
    const onDismiss = vi.fn();
    render(
      <PendingActivityBanner
        items={[item({ id: 'in-flight', status: 'pending' })]}
        onDismiss={onDismiss}
      />
    );
    expect(screen.queryByLabelText('pending.dismiss')).toBeNull();

    cleanup();
    render(
      <PendingActivityBanner
        items={[item({ id: 'done', status: 'confirmed' })]}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('pending.dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('done');
  });

  it('never offers dismissal for a bridge, which resolves on its own', () => {
    render(
      <PendingActivityBanner
        items={[item({ id: 'ex-1', kind: 'bridge', status: 'pending', dismissible: false })]}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText('pending.bridge.pending')).toBeTruthy();
    // The exchange id is the only reference a user could quote to support.
    expect(screen.getByText('1 SOL → 210 USDC')).toBeTruthy();
    expect(screen.queryByLabelText('pending.dismiss')).toBeNull();
  });
});
