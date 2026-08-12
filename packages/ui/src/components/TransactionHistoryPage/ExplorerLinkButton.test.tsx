/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBlurContainer = vi.fn(({ children }: { children?: React.ReactNode }) => (
  <div data-testid="blur-container">{children}</div>
));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `View on ${params.name}` : key,
  }),
}));

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType) => () => Component,
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    palette: { amber: '#fc0' },
    border: { default: '#333' },
    background: { card: '#111' },
    text: { primary: '#fff', tertiary: '#aaa' },
  },
  borderRadius: { md: 12, lg: 16 },
  borderWidth: { thin: 1 },
  getTransactionUrl: (_b: string, _e: string, explorer: string, txHash: string) =>
    `https://explorer/${explorer}/${txHash}`,
  getAvailableExplorers: () => [
    { key: 'solscan', name: 'Solscan' },
    { key: 'explorer', name: 'Explorer' },
  ],
  getDefaultExplorer: () => 'solscan',
  fontSize: { sm: 14, md: 16, base: 14, lg: 18 },
  fontWeight: { medium: 500 },
  opacity: { high: 0.9 },
  spacing: { sm: 8, md: 12, lg: 16 },
  duration: { normal: '200ms' },
  easing: { ease: 'ease' },
}));

vi.mock('../BlurContainer', () => ({
  BlurContainer: (props: { children?: React.ReactNode }) => mockBlurContainer(props),
}));

import { ExplorerLinkButton } from './ExplorerLinkButton';

describe('ExplorerLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses BlurContainer for both the trigger and the menu surface', () => {
    render(<ExplorerLinkButton txHash="tx-123" showMenu />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getAllByTestId('blur-container')).toHaveLength(2);
  });
});
