import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@salmon/shared', () => ({
  semantic: {
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    text: { secondary: '#A7B1C4', tertiary: '#8B96AD' },
    surface: { crest: '#1B2233' },
    border: { raised: '#6F7B95' },
  },
  borderRadius: { lg: 16 },
  fontSize: { xs: 10, sm: 12 },
  fontWeight: { semibold: '600' },
  spacing: { xs: 4, sm: 8, md: 12 },
}));

import { PendingActivityBanner } from './PendingActivityBanner';
import type { PendingActivityBannerProps } from './PendingActivityBanner';

type Item = PendingActivityBannerProps['items'][number];

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'sig-1',
  kind: 'swap',
  status: 'pending',
  detail: '1 SOL → 210 USDC',
  dismissible: true,
  ...overrides,
});

describe('PendingActivityBanner', () => {
  it('renders nothing when there is nothing in flight', () => {
    render(<PendingActivityBanner items={[]} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId('pending-activity-banner')).toBeNull();
  });

  it('labels every outcome, so state is never carried by colour alone', () => {
    render(
      <PendingActivityBanner
        items={[
          item({ id: 'a', status: 'pending' }),
          item({ id: 'b', kind: 'send', status: 'confirmed' }),
          item({ id: 'c', kind: 'send', status: 'failed' }),
          item({ id: 'd', status: 'expired' }),
        ]}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('pending.swap.pending')).toBeTruthy();
    expect(screen.getByText('pending.send.confirmed')).toBeTruthy();
    expect(screen.getByText('pending.send.failed')).toBeTruthy();
    expect(screen.getByText('pending.swap.expired')).toBeTruthy();
    // Expiry means nothing left the wallet — the row says so.
    expect(screen.getByText('pending.expiredHint')).toBeTruthy();
  });

  it('offers dismissal only once an entry has resolved', () => {
    const onDismiss = jest.fn();
    const { rerender } = render(
      <PendingActivityBanner items={[item({ id: 'x', status: 'pending' })]} onDismiss={onDismiss} />
    );
    expect(screen.queryByTestId('pending-activity-dismiss-x')).toBeNull();

    rerender(
      <PendingActivityBanner
        items={[item({ id: 'x', status: 'confirmed' })]}
        onDismiss={onDismiss}
      />
    );
    fireEvent.press(screen.getByTestId('pending-activity-dismiss-x'));
    expect(onDismiss).toHaveBeenCalledWith('x');
  });
});
