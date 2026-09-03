/**
 * @vitest-environment jsdom
 *
 * The form itself, apart from the two panels that word it: the fields it
 * draws, the network it names, and that save is the panel's decision.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseAddressBookFormResult } from '@salmon/shared';

import { renderInMode } from '../../test/renderInMode';
import { AddressForm } from './AddressForm';

vi.mock('../InputAddress', () => ({
  InputAddress: ({ address, testID }: { address: string; testID?: string }) => (
    <input data-testid={testID} defaultValue={address} />
  ),
}));

afterEach(cleanup);

function formStub(overrides: Partial<UseAddressBookFormResult> = {}): UseAddressBookFormResult {
  return {
    label: 'Alice',
    address: 'addr',
    setLabel: vi.fn(),
    setAddress: vi.fn(),
    handleValidation: vi.fn(),
    canSave: true,
    buildInput: vi.fn(),
    ...overrides,
  } as unknown as UseAddressBookFormResult;
}

describe('AddressForm', () => {
  it('names the network and commits through the save control', () => {
    const onSave = vi.fn();
    renderInMode(
      'dark',
      <AddressForm
        title="Add Address"
        subtitle="Save it"
        networkLabel="Bitcoin Testnet"
        form={formStub()}
        onSave={onSave}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Bitcoin Testnet')).toBeTruthy();
    fireEvent.click(screen.getByTestId('address-book-save-button'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('holds save while the form cannot save, and surfaces a refused save', () => {
    renderInMode(
      'dark',
      <AddressForm
        title="Edit Address"
        subtitle="Update it"
        networkLabel="Solana"
        form={formStub({ canSave: false })}
        onSave={() => {}}
        onBack={() => {}}
        errorText="Already saved"
      />
    );
    expect((screen.getByTestId('address-book-save-button') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(screen.getByTestId('address-book-save-error').textContent).toContain('Already saved');
  });
});
