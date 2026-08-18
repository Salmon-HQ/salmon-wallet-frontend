/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);

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
  CopyIcon: () => null,
  iconSize: { sm: 16 },
}));

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/hooks/useCopyFeedback')),
  colors: {
    text: { secondary: '#999', primary: '#fff' },
    status: { success: '#0f0' },
    background: { card: '#111' },
  },
  borderRadius: { md: 12 },
  componentSizes: { iconSizeMButton: 32 },
  fontFamily: { mono: 'monospace' },
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
  spacing: { sm: 8, md: 12 },
  fontSize: { sm: 14 },
  fontWeight: { medium: 500 },
  durationMs: { feedbackShort: 1500 },
}));

import { AddressCopyRow } from './AddressCopyRow';

describe('AddressCopyRow copy feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('announces the copy confirmation and reverts to the copy label', async () => {
    render(<AddressCopyRow label="From" address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />);

    // The handler awaits copyToClipboard before setting `copied`, so the click
    // has to be flushed through act — waiting on the mock alone returns before
    // React has re-rendered with the new label.
    await act(async () => {
      fireEvent.click(screen.getByTestId('tx-detail-copy-address-From'));
    });

    expect(mockCopyToClipboard).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('Copy From address')).toBeTruthy();
  });
});
