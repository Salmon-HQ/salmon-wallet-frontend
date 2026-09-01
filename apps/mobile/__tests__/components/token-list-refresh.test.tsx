/**
 * The home is left with a spinner on it after a swap.
 *
 * Leaving a swap fires a balance invalidation and navigates home in the same
 * tick, so the home paints while a refetch nobody asked for is in flight. When
 * the token list's refresh affordance was driven by that background flag, the
 * pull-to-refresh control came up over a list the user had never pulled — and
 * came up while the screen was still off-screen, where the native control has
 * no gesture to hand itself back to and stays.
 *
 * The affordance belongs to the gesture: it appears when the user pulls, and it
 * leaves when the refresh that pull started is done.
 */
import React from 'react';
import { RefreshControl } from 'react-native';
import { act, render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  semantic: { accent: { ink: '#FF5C45' } },
  spacing: { sm: 8 },
}));
jest.mock('../../src/components/TokenList/TokenListItem', () => 'TokenListItem');
jest.mock('../../src/components/Skeleton', () => ({ SkeletonRow: 'SkeletonRow' }));

import TokenList from '../../src/components/TokenList/TokenList';

function renderList(onRefresh: () => Promise<void>) {
  return render(<TokenList tokens={[]} onTokenPress={jest.fn()} onRefresh={onRefresh} />);
}

describe('token list refresh affordance', () => {
  it('does not spin for a refresh the user never asked for', () => {
    // A background refetch is in flight for the whole of this render — the
    // state the home is in the instant it paints after a swap.
    const onRefresh = jest.fn().mockReturnValue(new Promise<void>(() => {}));
    const view = renderList(onRefresh);

    expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);

    // Re-rendering while that refetch is still running changes nothing.
    view.rerender(<TokenList tokens={[]} onTokenPress={jest.fn()} onRefresh={onRefresh} />);
    expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('spins for the pull that started it, and stops when that refresh lands', async () => {
    let settle!: () => void;
    const onRefresh = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      })
    );
    const view = renderList(onRefresh);

    await act(async () => {
      view.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);

    await act(async () => {
      settle();
    });
    expect(view.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('survives a list that goes away before its refresh lands', async () => {
    let settle!: () => void;
    const onRefresh = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      })
    );
    const view = renderList(onRefresh);

    await act(async () => {
      view.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    view.unmount();

    await act(async () => {
      settle();
    });
  });
});
