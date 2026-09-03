/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AddressBookItem } from '../types/settings';
import type { ValidationCallbackResult } from '../types/validation';
import { useAddressAddPanel, useAddressEditPanel } from './useAddressBookPanel';

const contact: AddressBookItem = {
  name: 'Alice',
  address: 'So1anaAddress111111111111111111111111111111',
  networkId: 'solana-mainnet',
} as AddressBookItem;

describe('useAddressAddPanel', () => {
  it('starts empty and does not save until the form can', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAddressAddPanel({ networkId: 'solana-mainnet', onSave })
    );
    expect(result.current.form.label).toBe('');
    await act(() => result.current.save());
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('useAddressEditPanel', () => {
  it('seeds the form from the contact and saves against its original address', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAddressEditPanel({ contact, onSave }));
    expect(result.current.form.label).toBe('Alice');
    expect(result.current.form.address).toBe(contact.address);

    act(() =>
      result.current.form.handleValidation({
        isValid: true,
        resolvedAddress: contact.address,
      } as ValidationCallbackResult)
    );
    await act(() => result.current.save());
    expect(onSave).toHaveBeenCalledWith(
      contact.address,
      expect.objectContaining({ name: 'Alice' })
    );
  });
});
