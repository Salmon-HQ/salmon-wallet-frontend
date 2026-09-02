/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  markPaths: ['M0 0H1V1H0Z'],
}));

import { createSemantic, shadows, ThemeContext } from '@salmon/shared';
import type { ThemeContextValue } from '@salmon/shared';
import { DAppConnectApprovalView } from './DAppConnectApprovalView';

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

const ADDRESS = 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf';

describe('DAppConnectApprovalView', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the origin, the wallet address in full, and routes both buttons', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <DAppConnectApprovalView
        origin="https://app.example.com"
        appName="Example"
        address={ADDRESS}
        showOriginWarning
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
    expect(screen.getByText('Fg6P...KzXf')).toBeInTheDocument();
    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
    expect(screen.getByText('This origin does not use HTTPS.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'APPROVE' }));
    fireEvent.click(screen.getByRole('button', { name: 'DENY' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('stands on bedrock in the live mode with the mark in the brand accent', () => {
    const light = createSemantic('light');
    const value = {
      mode: 'light',
      preference: 'light',
      setPreference: async () => undefined,
      semantic: light,
      shadows,
      ready: true,
    } as unknown as ThemeContextValue;

    render(
      <ThemeContext.Provider value={value}>
        <DAppConnectApprovalView
          origin="https://app.example.com"
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      </ThemeContext.Provider>
    );

    expect(screen.getByTestId('dapp-connect-approval').style.backgroundColor).toBe(
      hexToRgb(light.surface.bedrock)
    );
    expect(screen.getByTestId('brand-mark').getAttribute('fill')).toBe(light.accent.fill);
  });
});
