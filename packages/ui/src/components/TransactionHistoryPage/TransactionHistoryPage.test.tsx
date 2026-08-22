/**
 * @vitest-environment jsdom
 *
 * The Activity surface's two steps. What is asserted here is the decision, not
 * the pixels: that the detail replaces the list inside the same surface rather
 * than stacking on it, that back — from the header, from Escape, from the
 * platform's own back — returns to the list instead of leaving the surface,
 * and that the surface's own arrival is not its content's event, which is the
 * part that would rot first (DESIGN.md §Motion, §The sink and the float — the
 * transition verb).
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The root `@salmon/shared` barrel drags React Native into a jsdom suite. The
// motion vocabulary is the real one, so a token change shows up here; the
// visual tokens are stubs, because nothing here asserts a colour.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme/durations')),
  ...(await vi.importActual('../../../../shared/src/motion/sinkFloat')),
  colors: {
    border: { subtle: '#222' },
    skeleton: { base: '#333' },
    text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
    accent: { primary: '#0af' },
  },
  spacing: { xs: 4, sm: 8, base: 12, md: 12, lg: 16, xl: 24, '5.5xl': 48 },
  borderRadius: { md: 12, lg: 16 },
  fontSize: { base: 14, bodyLg: 16, '5xl': 40 },
  fontWeight: { medium: 500 },
  opacity: { soft: 0.8 },
}));

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../icons', () => ({
  ArrowsClockwiseIcon: () => <span />,
  ReceiptIcon: () => <span />,
}));

vi.mock('../PageShell', () => ({
  PageShell: ({
    title,
    onBack,
    children,
  }: {
    title: React.ReactNode;
    onBack: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      <span data-testid="page-title">{title}</span>
      <button type="button" data-testid="page-back" onClick={onBack}>
        back
      </button>
      {children}
    </div>
  ),
}));

vi.mock('./TransactionItem', () => ({
  TransactionItem: ({
    transaction,
    onPress,
  }: {
    transaction: { id: string };
    onPress?: (transaction: { id: string }) => void;
  }) => (
    <button type="button" data-testid="activity-tx-row" onClick={() => onPress?.(transaction)}>
      {transaction.id}
    </button>
  ),
}));

vi.mock('../TransactionDetail', () => ({
  TransactionDetail: ({ transaction }: { transaction: { id: string } }) => (
    <div data-testid="tx-detail">{transaction.id}</div>
  ),
}));

const { reducedMotion } = await import('../../../../shared/src/theme/durations');
const { FLOAT_DELAY_MS } = await import('../../../../shared/src/motion/sinkFloat');
const { TransactionHistoryPage } = await import('./TransactionHistoryPage');

const TRANSACTIONS = [
  { id: 'tx-1', type: 'swap', status: 'completed', timestamp: 1, inputs: [], outputs: [] },
  { id: 'tx-2', type: 'send', status: 'completed', timestamp: 2, inputs: [], outputs: [] },
] as never[];

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: reducedMotion.query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

function renderPage(onBack = vi.fn()) {
  render(<TransactionHistoryPage onBack={onBack} transactions={TRANSACTIONS} />);
  return onBack;
}

/** The step frame is the node the verb is applied to: the step's own parent. */
function frameOf(testId: string): HTMLElement {
  const step = screen.getByTestId(testId).parentElement;
  if (!step) throw new Error(`no frame around ${testId}`);
  return step;
}

/** Steps into the first row's detail and lets the sink and the beat pass. */
function stepIntoDetail() {
  fireEvent.click(screen.getAllByTestId('activity-tx-row')[0]);
  act(() => {
    vi.advanceTimersByTime(FLOAT_DELAY_MS);
  });
}

beforeEach(() => {
  stubMatchMedia(false);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe('TransactionHistoryPage', () => {
  it('titles the surface Activity', () => {
    renderPage();
    expect(screen.getByTestId('page-title').textContent).toBe('actions.activity');
  });

  // The line that would rot first: a surface's own arrival is not its
  // content's event, so the first view is placed rather than played.
  it('does not speak the verb on the surface own arrival', () => {
    renderPage();
    expect(frameOf('activity-list-step').style.animation).toBe('none');
  });

  it('speaks the verb once a step happens inside the open surface', () => {
    renderPage();
    stepIntoDetail();

    expect(screen.queryByTestId('activity-list-step')).toBeNull();
    expect(frameOf('activity-detail-step').style.animation).toBe('');
  });

  it('shows the detail in place instead of stacking a second surface', () => {
    renderPage();
    stepIntoDetail();

    expect(screen.getByTestId('tx-detail').textContent).toBe('tx-1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns to the list from the header instead of leaving the surface', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onBack = renderPage();
    stepIntoDetail();

    fireEvent.click(screen.getByTestId('page-back'));
    expect(back).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    act(() => {
      vi.advanceTimersByTime(FLOAT_DELAY_MS);
    });
    expect(screen.getByTestId('activity-list-step')).toBeTruthy();
  });

  it('treats Escape as the same gesture as back', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const onBack = renderPage();
    stepIntoDetail();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(back).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('leaves the surface from the list, where back has nothing to return to', () => {
    const onBack = renderPage();
    fireEvent.click(screen.getByTestId('page-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('gives the platform back somewhere to return from', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    renderPage();
    stepIntoDetail();

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  // Reduce motion is a parallel mapping, not a hole: the swap still happens.
  it('swaps the step immediately under reduce motion', () => {
    stubMatchMedia(true);
    renderPage();

    fireEvent.click(screen.getAllByTestId('activity-tx-row')[0]);
    expect(screen.getByTestId('activity-detail-step')).toBeTruthy();
  });
});
