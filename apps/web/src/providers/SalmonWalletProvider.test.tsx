/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';

const mockSendRequestAndWait = vi.fn();

vi.mock('../utils/walletBridge', () => ({
  sendRequestAndWait: (...args: unknown[]) => mockSendRequestAndWait(...args),
}));

// The real @salmon/shared barrel drags in heavy chain deps that cannot load in
// jsdom; the provider only needs these two serializers at runtime.
vi.mock('@salmon/shared', () => ({
  serializeSignedTransactionFromApproval: vi.fn(),
  serializeSignedTransactionsFromApproval: vi.fn(),
}));

import { SalmonWalletRegistrar } from './SalmonWalletProvider';

interface SalmonWebWallet {
  supportedOffchainMessageVersions: readonly number[];
  signOffchainMessage(
    origin: string,
    input: { messageVersion: number; message: string; requiredSigners: Uint8Array[] },
  ): Promise<{
    signedOffchainMessage: Uint8Array;
    signature: Uint8Array;
    signatureType: 'ed25519';
  } | null>;
}

function getWallet(): SalmonWebWallet {
  render(<SalmonWalletRegistrar />);
  return (window as unknown as { __salmonWallet: SalmonWebWallet }).__salmonWallet;
}

describe('SalmonWalletProvider signOffchainMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  it('exposes the OCMS method and v1-only supported versions', () => {
    const wallet = getWallet();

    expect(typeof wallet.signOffchainMessage).toBe('function');
    expect(wallet.supportedOffchainMessageVersions).toEqual([1]);
  });

  it('bridges the PR#92 input as JSON and bs58-decodes the payload back to Uint8Array', async () => {
    const wallet = getWallet();
    const signerBytes = new Uint8Array(32).fill(3);
    const bufferBytes = new Uint8Array([9, 8, 7, 6]);
    const signatureBytes = new Uint8Array(64).fill(5);
    mockSendRequestAndWait.mockResolvedValue({
      approved: true,
      payload: {
        signedOffchainMessage: bs58.encode(bufferBytes),
        signature: bs58.encode(signatureBytes),
        signatureType: 'ed25519',
      },
    });

    const result = await wallet.signOffchainMessage('https://dapp.example', {
      messageVersion: 1,
      message: 'hello ocms',
      requiredSigners: [signerBytes],
    });

    expect(mockSendRequestAndWait).toHaveBeenCalledTimes(1);
    const bridgeRequest = mockSendRequestAndWait.mock.calls[0][0] as {
      origin: string;
      request: { method: string; params: { data: number[]; requiredSigners: string[] } };
    };
    expect(bridgeRequest.origin).toBe('https://dapp.example');
    expect(bridgeRequest.request.method).toBe('signOffchain');
    expect(bridgeRequest.request.params.data).toEqual(
      Array.from(new TextEncoder().encode('hello ocms')),
    );
    expect(bridgeRequest.request.params.requiredSigners).toEqual([bs58.encode(signerBytes)]);

    expect(result).not.toBeNull();
    expect(result?.signedOffchainMessage).toBeInstanceOf(Uint8Array);
    expect(result?.signedOffchainMessage).toEqual(bufferBytes);
    expect(result?.signature).toEqual(signatureBytes);
    expect(result?.signatureType).toBe('ed25519');
  });

  it('rejects unsupported message versions without opening an approval', async () => {
    const wallet = getWallet();

    await expect(
      wallet.signOffchainMessage('https://dapp.example', {
        messageVersion: 2,
        message: 'hello',
        requiredSigners: [],
      }),
    ).rejects.toThrow('Unsupported off-chain message version');
    expect(mockSendRequestAndWait).not.toHaveBeenCalled();
  });

  it('returns null when the user rejects', async () => {
    const wallet = getWallet();
    mockSendRequestAndWait.mockResolvedValue({ approved: false, error: 'User rejected the request' });

    const result = await wallet.signOffchainMessage('https://dapp.example', {
      messageVersion: 1,
      message: 'hello',
      requiredSigners: [new Uint8Array(32).fill(1)],
    });

    expect(result).toBeNull();
  });
});
