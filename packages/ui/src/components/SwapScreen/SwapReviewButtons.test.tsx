/**
 * @vitest-environment jsdom
 *
 * The confirm button and what it is allowed to claim. A quote in flight owns
 * the button and says so; a confirm in flight does not — the review leaves at
 * the tap and the wave wait takes over (DESIGN.md, §The wait — "Swap confirm —
 * sink, wave, float"), so the button only refuses a second press.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwapReviewButtons } from './SwapReviewButtons';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// Only the tokens this row lays out with; the real barrel reaches React
// Native, which this DOM test has no business loading.
vi.mock('@salmon/shared', () => ({
  spacing: { md: 12, '2xl': 24 },
  componentSizes: { buttonHeightCompact: 44 },
}));

// Stand-ins that report what the row hands each button and nothing else.
vi.mock('../Button', () => ({
  PrimaryButton: ({
    testID,
    loading,
    disabled,
  }: {
    testID?: string;
    loading?: boolean;
    disabled?: boolean;
  }) => (
    <button
      data-testid={testID}
      data-loading={String(Boolean(loading))}
      disabled={Boolean(disabled)}
    />
  ),
  SecondaryButton: ({ testID }: { testID?: string }) => <button data-testid={testID} />,
}));

afterEach(() => {
  cleanup();
});

describe('SwapReviewButtons — what the confirm button claims', () => {
  it('never spins the confirm button for a confirm in flight — the wave wait owns that', () => {
    render(<SwapReviewButtons onBack={vi.fn()} onConfirm={vi.fn()} isConfirming />);
    const confirm = screen.getByTestId('swap-confirm-button') as HTMLButtonElement;
    expect(confirm.dataset.loading).toBe('false');
    expect(confirm.disabled).toBe(true);
  });

  it('still spins the confirm button while a fresh quote is in flight', () => {
    render(<SwapReviewButtons onBack={vi.fn()} onConfirm={vi.fn()} isRefreshing />);
    const confirm = screen.getByTestId('swap-confirm-button') as HTMLButtonElement;
    expect(confirm.dataset.loading).toBe('true');
    expect(confirm.disabled).toBe(true);
  });
});
