/**
 * @vitest-environment jsdom
 *
 * The address book is the list a send destination is picked from, so the row
 * has to name the whole network. A contact saved on a test network that reads
 * as its mainnet twin is the confusion DESIGN.md §Chain identity calls a
 * fund-safety rule; that is what the first test here protects.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AddressBookPanel } from './AddressBookPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../SettingsPanelContent', () => ({
  SettingsPanelContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const devnetContact = {
  name: 'Test Wallet',
  address: 'FakeAddress1111111111111111111111111111111',
  networkId: 'solana-devnet',
  networkName: 'Devnet',
};

function renderPanel(contacts = [devnetContact]) {
  render(
    <AddressBookPanel
      contacts={contacts}
      activeNetworkId="solana-devnet"
      onAddContact={vi.fn()}
      onEditContact={vi.fn()}
      onRemoveContact={vi.fn()}
      onBack={vi.fn()}
    />
  );
}

describe('AddressBookPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the environment of a non-mainnet contact, never the chain alone', () => {
    renderPanel();

    expect(screen.getByText(/Solana Devnet/)).toBeInTheDocument();
    expect(screen.queryByText(/Solana$/)).not.toBeInTheDocument();
  });

  it('names a mainnet contact in full too', () => {
    renderPanel([
      { ...devnetContact, networkId: 'bitcoin-mainnet', networkName: 'Bitcoin Mainnet' },
    ]);

    expect(screen.getByText(/Bitcoin Mainnet/)).toBeInTheDocument();
  });
});
