/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCopyToClipboard = vi.fn().mockResolvedValue(true);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key === 'transactions.detail.copyAddressLabel' ? `Copy ${options?.label} address` : key,
  }),
}));

// The real barrel, with only the clipboard overridden.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

import { createSemantic } from '@salmon/shared';
import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { AddressCopyRow } from './AddressCopyRow';

const ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

describe('AddressCopyRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('truncates the address and copies the whole of it', async () => {
    render(<AddressCopyRow label="From" address={ADDRESS} />);
    expect(screen.getByTestId('tx-detail-address-value').textContent).toBe('7xKXtg...osgAsU');

    // The handler awaits copyToClipboard before setting `copied`, so the click
    // has to be flushed through act.
    await act(async () => {
      fireEvent.click(screen.getByTestId('tx-detail-copy-address-From'));
    });

    expect(mockCopyToClipboard).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('Copy From address')).toBeTruthy();
  });

  it("reads the live mode: in light the address takes light's ink", () => {
    const light = createSemantic('light');
    renderInMode('light', <AddressCopyRow label="To" address={ADDRESS} />);

    expect(screen.getByTestId('tx-detail-address-value').style.color).toBe(
      asRenderedColor(light.text.primary)
    );
  });
});
