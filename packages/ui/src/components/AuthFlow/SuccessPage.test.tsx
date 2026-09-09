/**
 * @vitest-environment jsdom
 *
 * Success — "Check derivables" (owner, 2026-09-09). The DOM twin of
 * `apps/mobile/__tests__/app/success-check-derived.test.tsx`: the button asks
 * the scan, the answer comes over this page in `DerivedAccountsSheet`, — the hook
 * itself (`useCheckDerivables`) has its own suite in shared.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheck = vi.fn();
const mockUseCheckDerivables = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../WaterColumn', () => ({
  WaterColumn: () => null,
  waterColumnHost: {},
}));

vi.mock('../DerivedAccountsSheet', () => ({
  DerivedAccountsSheet: ({ visible, scanning }: { visible: boolean; scanning: boolean }) =>
    visible ? <div data-testid={scanning ? 'sheet-scanning' : 'sheet-answer'} /> : null,
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useCheckDerivables: () => mockUseCheckDerivables(),
}));

import { SuccessPage } from './SuccessPage';

const scanState = (over: Partial<Record<string, unknown>> = {}) => ({
  scanning: false,
  check: mockCheck,
  sheet: { visible: false, scanning: false, finds: [] },
  ...over,
});

afterEach(cleanup);

describe('SuccessPage — check derivables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCheckDerivables.mockReturnValue(scanState());
  });

  it('asks the scan for the active wallet when clicked', () => {
    render(<SuccessPage onGoToWallet={vi.fn()} />);
    fireEvent.click(screen.getByTestId('success-check-derived-button'));
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  it('shows the wait over this page while the scan runs, then the answer', () => {
    mockUseCheckDerivables.mockReturnValue(
      scanState({ scanning: true, sheet: { visible: true, scanning: true, finds: [] } })
    );
    const { rerender } = render(<SuccessPage onGoToWallet={vi.fn()} />);
    expect(screen.getByTestId('sheet-scanning')).toBeTruthy();

    mockUseCheckDerivables.mockReturnValue(
      scanState({ sheet: { visible: true, scanning: false, finds: [] } })
    );
    rerender(<SuccessPage onGoToWallet={vi.fn()} />);
    expect(screen.getByTestId('sheet-answer')).toBeTruthy();
  });

  it('still enters the wallet', () => {
    const onGoToWallet = vi.fn();
    render(<SuccessPage onGoToWallet={onGoToWallet} />);
    fireEvent.click(screen.getByTestId('success-go-to-wallet-button'));
    expect(onGoToWallet).toHaveBeenCalledTimes(1);
  });
});
