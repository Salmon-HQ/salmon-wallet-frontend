/**
 * @vitest-environment jsdom
 *
 * The default path out of a destructive sheet must be the one that destroys
 * nothing. These assertions are about order and weight, not colour — the
 * colour half of the rule is asserted on the tokens themselves, in
 * `packages/shared/src/theme/contrast.test.ts`.
 */

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderConfirm(
  isDanger: boolean,
  extra: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}
) {
  stubMatchMedia();
  const onConfirm = vi.fn();
  renderInMode(
    'dark',
    <ConfirmDialog
      visible
      onClose={vi.fn()}
      onConfirm={onConfirm}
      isDanger={isDanger}
      title="Reset Wallet"
      message="This erases every wallet on this device."
      cancelText="Cancel"
      confirmText="Delete All Data"
      confirmTestID="confirm"
      {...extra}
    />
  );
  return {
    cancel: screen.getByRole('button', { name: 'Cancel' }),
    confirm: screen.getByTestId('confirm'),
    onConfirm,
  };
}

describe('ConfirmDialog: the safe path is the default one', () => {
  it('puts Cancel ahead of the destructive action in reading and tab order', () => {
    const { cancel, confirm } = renderConfirm(true);
    // Node.DOCUMENT_POSITION_FOLLOWING — confirm comes after cancel.
    expect(cancel.compareDocumentPosition(confirm) & 4).toBeTruthy();
  });

  it('puts the ordinary confirmation last, as the primary', () => {
    const { cancel, confirm } = renderConfirm(false);
    expect(cancel.compareDocumentPosition(confirm) & 4).toBeTruthy();
  });

  it('states the danger with a glyph as well as with colour', () => {
    renderConfirm(true);
    expect(screen.getByTestId('confirm-dialog').querySelector('svg')).toBeTruthy();
  });

  it('is a sheet, on the <dialog> element', () => {
    renderConfirm(true);
    expect(screen.getByTestId('confirm-dialog').tagName).toBe('DIALOG');
  });

  it('confirms through the password gate when one is required', async () => {
    const validatePassword = vi.fn((password: string) => Promise.resolve(password === 'ok-000'));
    const { onConfirm } = renderConfirm(false, { requirePassword: true, validatePassword });

    fireEvent.change(screen.getByTestId('confirm-dialog-password'), {
      target: { value: 'wrong-000' },
    });
    fireEvent.click(screen.getByTestId('confirm'));
    await waitFor(() => expect(screen.getByText('Invalid password')).toBeTruthy());
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('confirm-dialog-password'), {
      target: { value: 'ok-000' },
    });
    fireEvent.click(screen.getByTestId('confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('ok-000'));
  });

  it('offers one way out on an acknowledge-only sheet', () => {
    stubMatchMedia();
    renderInMode(
      'dark',
      <ConfirmDialog
        visible
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        acknowledgeOnly
        title="Something failed"
        message="Nothing to do here."
        confirmText="Close"
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
