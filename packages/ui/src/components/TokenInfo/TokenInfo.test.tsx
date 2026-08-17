/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      const template = fallback ?? key;
      if (!options) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(options[name] ?? ''));
    },
  }),
}));

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType) => () => Component,
}));

vi.mock('../../icons', () => ({
  CheckIcon: () => null,
  iconSize: { md: 20 },
}));

vi.mock('../Icon', () => ({
  CopyIcon: () => null,
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    background: { card: '#111' },
    text: { primary: '#fff', muted: '#999', secondary: '#aaa' },
    input: { background: '#222' },
    accent: { primary: '#f54' },
    status: { success: '#0f0' },
    skeleton: { base: '#333' },
  },
  spacing: { xs: 4, xxs: 2, sm: 8, md: 12, lg: 16 },
  borderRadius: { lg: 16, md: 12 },
  fontFamily: { sans: 'System', mono: 'monospace' },
  fontWeight: { semibold: 600, regular: 400, medium: 500 },
  fontSize: { sm: 14, md: 16, base: 14 },
  formatLargeNumber: (value: number) => String(value),
  useCurrencyContext: () => [null, { formatLarge: (value: number) => `$${value}` }],
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  lineHeight: { normal: 1.5 },
  duration: { normal: '200ms' },
  durationMs: { feedbackLong: 2000 },
  easing: { ease: 'ease' },
  tabularNums: { css: {} },
}));

import { TokenInfo } from './TokenInfo';

describe('TokenInfo copy contract address', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('announces the copy confirmation and reverts to the copy label', async () => {
    render(<TokenInfo contractAddress="So11111111111111111111111111111111111111112" />);

    // The handler awaits navigator.clipboard.writeText before setting `copied`,
    // so the click has to be flushed through act — waiting on the clipboard mock
    // alone returns before React has re-rendered with the new label.
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy contract address'));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'So11111111111111111111111111111111111111112'
    );
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('Copy contract address')).toBeTruthy();
  });
});
