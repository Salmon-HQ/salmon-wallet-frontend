/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { createSemantic } from '@salmon/shared';
import { asRenderedColor, renderInMode } from '../../test/renderInMode';
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

  it('reads the live mode: in light a row sits on the light crest', () => {
    const light = createSemantic('light');
    renderInMode(
      'light',
      <PendingActivityBanner items={[item({ id: 'a', status: 'confirmed' })]} onDismiss={vi.fn()} />
    );

    expect(screen.getByTestId('pending-activity-row-confirmed').style.backgroundColor).toBe(
      asRenderedColor(light.surface.crest)
    );
  });
});
