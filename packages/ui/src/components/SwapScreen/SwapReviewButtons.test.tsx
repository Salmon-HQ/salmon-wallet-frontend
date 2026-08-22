/**
 * @vitest-environment jsdom
 *
 * The confirm button and what it is allowed to claim. A quote in flight owns
 * the button and says so; a confirm in flight does not — the review leaves at
 * the tap and the wave wait takes over (DESIGN.md, §The wait — "Swap confirm —
 * sink, wave, float"), so the button only refuses a second press.
 */
import type { CSSProperties } from 'react';
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

// Stand-ins that report what the pair hands each button and nothing else.
vi.mock('../Button', () => ({
  PrimaryButton: ({
    testID,
    loading,
    disabled,
    style,
  }: {
    testID?: string;
    loading?: boolean;
    disabled?: boolean;
    style?: CSSProperties;
  }) => (
    <button
      data-testid={testID}
      data-loading={String(Boolean(loading))}
      disabled={Boolean(disabled)}
      style={style}
    />
  ),
  SecondaryButton: ({ testID, style }: { testID?: string; style?: CSSProperties }) => (
    <button data-testid={testID} style={style} />
  ),
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

describe('SwapReviewButtons — the pair stacks, full width', () => {
  // The pair used to share a line, each action in a `flex: 1` wrapper. It does
  // not any more: the second action is the longest string this screen can show
  // — an expired quote turns it into "Refresh Quote" / "Refresh Estimate" —
  // and half a narrow surface is not enough for that copy in Spanish. Nothing
  // asserted the side-by-side arrangement here before; what is asserted now is
  // the property the stack exists for.

  it('stacks the two actions in a column, each stretched to the full width', () => {
    const { container } = render(<SwapReviewButtons onBack={vi.fn()} onConfirm={vi.fn()} />);
    // Emotion puts the container's layout in a class, so read the resolved
    // style rather than the inline one.
    const stack = getComputedStyle(container.firstElementChild as HTMLElement);

    expect(stack.flexDirection).toBe('column');
    expect(stack.alignItems).toBe('stretch');
  });

  it('puts the committing action at the bottom, as every other surface does', () => {
    // OnboardingLayout's ratified band order is assist / secondary / action,
    // with the full-width primary bottom-most. Back is the secondary here, so
    // it sits above Confirm.
    render(<SwapReviewButtons onBack={vi.fn()} onConfirm={vi.fn()} />);
    const buttons = Array.from(document.querySelectorAll('[data-testid]'));

    expect(buttons.map((button) => button.getAttribute('data-testid'))).toEqual([
      'swap-back-button',
      'swap-confirm-button',
    ]);
  });

  it('lets neither action narrow itself, in any state the pair can be in', () => {
    // The label changes with the state — "Confirm", "Refresh Quote",
    // "Refresh Estimate" — and the height stays pinned on both buttons, so the
    // stack reserves the same space whichever one it carries.
    for (const confirmLabel of ['Confirmar', 'Actualizar cotizacion']) {
      render(
        <SwapReviewButtons onBack={vi.fn()} onConfirm={vi.fn()} confirmLabel={confirmLabel} />
      );
      for (const testID of ['swap-back-button', 'swap-confirm-button']) {
        const button = screen.getByTestId(testID) as HTMLButtonElement;
        expect(button.style.width).toBe('100%');
        expect(button.style.maxWidth).toBe('');
        expect(button.style.height).toBe('44px');
      }
      cleanup();
    }
  });
});
