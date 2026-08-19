/**
 * @vitest-environment jsdom
 *
 * The grouped details card (DOM mirror). The contract shared with mobile:
 * the rows live in ONE card, the critical rows are always visible, and the
 * advanced rows fold behind a "Details" disclosure that is collapsed by
 * default and toggles with `aria-expanded`.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The root `@salmon/shared` barrel reaches React Native, which Vite cannot
// parse. The theme subtree is pure and stands in for the barrel.
vi.mock('@salmon/shared', async () => {
  const theme = await import('../../../../shared/src/theme');
  return { ...theme };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { SwapDetailsCard } from './SwapDetailsCard';

const rows = [
  { label: 'Salmon fee', value: '0.5%' },
  { label: 'Slippage Tolerance', value: '20%' },
];
const advancedRows = [
  { label: 'Router', value: 'Jupiter' },
  { label: 'Swap Mode', value: 'ExactIn' },
];

afterEach(cleanup);

describe('SwapDetailsCard', () => {
  it('always shows the critical rows and folds the advanced ones by default', () => {
    render(<SwapDetailsCard rows={rows} advancedRows={advancedRows} />);

    expect(screen.getByText('Salmon fee')).toBeTruthy();
    expect(screen.getByText('Slippage Tolerance')).toBeTruthy();
    expect(screen.queryByText('Router')).toBeNull();
    expect(screen.queryByText('Swap Mode')).toBeNull();

    const disclosure = screen.getByTestId('swap-details-disclosure');
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
  });

  it('reveals the advanced rows on disclosure click, and hides them again', () => {
    render(<SwapDetailsCard rows={rows} advancedRows={advancedRows} />);

    const disclosure = screen.getByTestId('swap-details-disclosure');
    fireEvent.click(disclosure);
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Router')).toBeTruthy();
    expect(screen.getByText('Swap Mode')).toBeTruthy();

    fireEvent.click(disclosure);
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Router')).toBeNull();
  });

  it('renders no disclosure at all when there are no advanced rows', () => {
    render(<SwapDetailsCard rows={rows} />);
    expect(screen.queryByTestId('swap-details-disclosure')).toBeNull();
  });
});
