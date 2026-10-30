/**
 * Fresh co-signers and the read message (spec 043 FR-041, FR-044).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateKeyPairSigner,
  getAddressEncoder,
  getPublicKeyFromAddress,
  verifySignature,
  type SignatureBytes,
} from '@solana/kit';

import {
  encodeReadMessage,
  generateFreshSigners,
  MAX_FRESH_SIGNERS,
  signReadMessage,
} from './fresh-signers';
import { signProposal } from './index';
import { signAndSendSolanaTransaction } from '../broadcast';
import type { TransactionProposal } from '../confirmation/types';

vi.mock('../broadcast', () => ({
  signAndSendSolanaTransaction: vi.fn(async () => 'signature-1'),
}));

describe('generateFreshSigners', () => {
  it('allows one fresh signer per proposal', () => {
    expect(MAX_FRESH_SIGNERS).toBe(1);
  });

  it('returns n distinct signers whose private keys cannot be exported', async () => {
    const signers = await generateFreshSigners(2);
    expect(signers).toHaveLength(2);
    expect(new Set(signers.map((s) => s.address)).size).toBe(2);
    for (const signer of signers) {
      await expect(crypto.subtle.exportKey('pkcs8', signer.keyPair.privateKey)).rejects.toThrow();
    }
    expect(await generateFreshSigners(0)).toEqual([]);
  });
});

describe('encodeReadMessage', () => {
  it('is the 43-byte layout [chain 0, 32, id, empty key, epoch 0 as u64]', async () => {
    const { address } = await generateKeyPairSigner();
    const id = getAddressEncoder().encode(address);

    const message = encodeReadMessage(address);

    expect(message).toHaveLength(43);
    expect(Array.from(message)).toEqual([0, 32, ...id, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('signReadMessage', () => {
  it('returns the message, a signature that verifies under the viewer, and the viewer key', async () => {
    const viewer = await generateKeyPairSigner();
    const { address: ciphertext } = await generateKeyPairSigner();

    const read = await signReadMessage(viewer, ciphertext);

    expect(read.message).toEqual(encodeReadMessage(ciphertext));
    expect(read.signer).toEqual(new Uint8Array(getAddressEncoder().encode(viewer.address)));
    expect(read.signature).toHaveLength(64);
    expect(
      await verifySignature(
        await getPublicKeyFromAddress(viewer.address),
        read.signature as SignatureBytes,
        read.message
      )
    ).toBe(true);
  });
});

describe('signProposal with co-signers', () => {
  const OWNER = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
  const account = { signer: { address: OWNER } } as never;

  function proposal(expect: TransactionProposal['expect']): TransactionProposal {
    return {
      id: 'p-1',
      networkId: 'solana-devnet',
      transaction: 'AA==',
      expect,
      display: { title: 'Review', rows: [], pendingTitle: 'Processing' },
    };
  }

  beforeEach(() => vi.mocked(signAndSendSolanaTransaction).mockClear());

  it('declares core’s co-signers after the spread, and hands them to broadcast', async () => {
    const [k1] = await generateFreshSigners(1);
    const smuggled = { allowedPrograms: ['p'], coSigners: ['someone-else'] } as never;

    const result = await signProposal(account, proposal(smuggled), [k1]);

    expect(result).toEqual({ signature: 'signature-1' });
    expect(signAndSendSolanaTransaction).toHaveBeenCalledWith(
      account,
      'AA==',
      { feePayer: OWNER, allowedPrograms: ['p'], coSigners: [String(k1.address)] },
      { coSigners: [k1] }
    );
  });

  it('without co-signers, makes the same call as before', async () => {
    await signProposal(account, proposal({ allowedPrograms: ['p'] }));

    expect(vi.mocked(signAndSendSolanaTransaction).mock.calls[0]).toEqual([
      account,
      'AA==',
      { feePayer: OWNER, allowedPrograms: ['p'] },
    ]);
  });
});
