/**
 * @vitest-environment jsdom
 *
 * The save control is the system's primary button now; what must not have
 * moved is when it commits. An edit starts saveable (the contact's label and
 * resolved address are already there) and stops being saveable the moment the
 * label is emptied. The `data-testid` the Playwright suites select it by is
 * unchanged.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AddressEditPanel } from './AddressEditPanel';

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
  ...(await vi.importActual('../../../../shared/src/utils/network')),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

vi.mock('../SettingsPanelContent', () => ({
  SettingsPanelContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

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

const contact = {
  name: 'Exchange',
  address: FAKE_ADDRESS,
  networkId: 'solana-mainnet',
  networkName: 'Solana',
};

describe('AddressEditPanel', () => {
  afterEach(() => {
    cleanup();
  });

  function renderPanel(onSave = vi.fn()) {
    render(
      <AddressEditPanel
        contact={contact}
        activeBlockchain="solana"
        onSave={onSave}
        onBack={() => {}}
      />
    );
    return onSave;
  }

  // The edit screen restates which network the contact lives on; on a test
  // network that restatement is the fund-safety signal, so it must not shrink
  // to the chain name (DESIGN.md §Chain identity).
  it('names the environment of a non-mainnet contact', () => {
    render(
      <AddressEditPanel
        contact={{ ...contact, networkId: 'solana-devnet', networkName: 'Devnet' }}
        activeBlockchain="solana"
        onSave={vi.fn()}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Solana Devnet')).toBeInTheDocument();
  });

  it('disables save when the label is emptied and enables it again when refilled', () => {
    renderPanel();

    const save = screen.getByTestId('address-book-save-button');
    expect(save).toBeEnabled();

    fireEvent.change(screen.getByTestId('address-book-label-input'), { target: { value: '' } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByTestId('address-book-label-input'), {
      target: { value: 'Cold storage' },
    });
    expect(save).toBeEnabled();
  });

  it('commits the edit against the original address through the save control', async () => {
    const onSave = renderPanel();

    fireEvent.change(screen.getByTestId('address-book-label-input'), {
      target: { value: 'Cold storage' },
    });
    fireEvent.click(screen.getByTestId('address-book-save-button'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(FAKE_ADDRESS, {
        address: FAKE_ADDRESS,
        name: 'Cold storage',
        networkId: 'solana-mainnet',
        domain: undefined,
      });
    });
  });
});
