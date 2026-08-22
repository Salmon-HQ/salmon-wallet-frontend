/**
 * @vitest-environment jsdom
 *
 * The save control is the system's primary button now; what must not have
 * moved is when it commits. It stays disabled until the form says it can save
 * (a non-empty label and a valid address), and it keeps the `data-testid` the
 * Playwright suites select it by.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AddressAddPanel } from './AddressAddPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse, so the module is stubbed with the runtime-agnostic theme tokens plus
// the real form hook — the enabling condition under test is that hook's.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
  ...(await vi.importActual('../../../../shared/src/hooks/useAddressBookForm')),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

vi.mock('../SettingsPanelContent', () => ({
  SettingsPanelContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

/** Any non-empty value validates; resolution is the hook's caller's problem. */
vi.mock('../InputAddress', () => ({
  InputAddress: ({
    address,
    onChange,
    onValidation,
  }: {
    address: string;
    onChange: (value: string) => void;
    onValidation: (result: { isValid: boolean }) => void;
  }) => (
    <input
      data-testid="address-book-address-input"
      value={address}
      onChange={(event) => {
        onChange(event.target.value);
        onValidation({ isValid: event.target.value.length > 0 });
      }}
    />
  ),
}));

const FAKE_ADDRESS = 'FakeAddress1111111111111111111111111111111';

describe('AddressAddPanel', () => {
  afterEach(() => {
    cleanup();
  });

  function renderPanel(onSave = vi.fn()) {
    render(
      <AddressAddPanel
        activeNetworkId="solana-mainnet"
        activeNetworkName="Solana"
        activeBlockchain="solana"
        onSave={onSave}
        onBack={() => {}}
      />
    );
    return onSave;
  }

  it('keeps save disabled until the label and the address are both filled', () => {
    renderPanel();

    const save = screen.getByTestId('address-book-save-button');
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByTestId('address-book-label-input'), {
      target: { value: 'Exchange' },
    });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByTestId('address-book-address-input'), {
      target: { value: FAKE_ADDRESS },
    });
    expect(save).toBeEnabled();
  });

  it('commits the contact through the save control', async () => {
    const onSave = renderPanel();

    fireEvent.change(screen.getByTestId('address-book-label-input'), {
      target: { value: 'Exchange' },
    });
    fireEvent.change(screen.getByTestId('address-book-address-input'), {
      target: { value: FAKE_ADDRESS },
    });
    fireEvent.click(screen.getByTestId('address-book-save-button'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        address: FAKE_ADDRESS,
        name: 'Exchange',
        networkId: 'solana-mainnet',
        domain: undefined,
      });
    });
  });
});
