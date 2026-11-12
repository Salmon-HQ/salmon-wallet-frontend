import { beforeAll, describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import {
  generateKeyPairSigner,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  type KeyPairSigner,
} from '@solana/kit';
import { prepareMerchantTransaction } from './transaction-request-checks';
import {
  MERCHANT_BLOCKHASH,
  sponsoredMerchantTransaction,
} from '../../test-utils/solana-pay-merchant';

let sponsor: KeyPairSigner;
let user: KeyPairSigner;
let merchant: KeyPairSigner;

beforeAll(async () => {
  [sponsor, user, merchant] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
});

function rpcWithValidBlockhash(valid = true) {
  return {
    isBlockhashValid: vi.fn().mockReturnValue({ send: async () => ({ value: valid }) }),
    getLatestBlockhash: vi.fn(() => {
      throw new Error('a signed transaction must keep the merchant blockhash');
    }),
  };
}

function decode(base64: string) {
  const transaction = getTransactionDecoder().decode(new Uint8Array(Buffer.from(base64, 'base64')));
  return {
    transaction,
    message: getCompiledTransactionMessageDecoder().decode(transaction.messageBytes),
  };
}

describe('prepareMerchantTransaction — sponsored', () => {
  it.each(['legacy', 0] as const)(
    'passes a %s transaction through byte for byte',
    async (version) => {
      const wire = await sponsoredMerchantTransaction({
        version,
        sponsor,
        user: user.address,
        merchant: merchant.address,
      });
      const rpc = rpcWithValidBlockhash();

      const prepared = await prepareMerchantTransaction(rpc as never, user.address, wire);

      expect(prepared.wire).toBe(wire);
      expect(prepared).toMatchObject({
        sponsored: true,
        feePayer: sponsor.address,
        signer: user.address,
        lifetime: MERCHANT_BLOCKHASH,
      });
      const before = decode(wire).transaction;
      const after = decode(prepared.wire).transaction;
      expect(after.signatures[sponsor.address]).toEqual(before.signatures[sponsor.address]);
      expect(after.signatures[sponsor.address]).not.toBeNull();
      expect(rpc.isBlockhashValid).toHaveBeenCalledWith(MERCHANT_BLOCKHASH, expect.anything());
      expect(rpc.getLatestBlockhash).not.toHaveBeenCalled();
    }
  );

  it('carries the message bytes base58-encoded for the dApp preview', async () => {
    const wire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
    });

    const prepared = await prepareMerchantTransaction(
      rpcWithValidBlockhash() as never,
      user.address,
      wire
    );

    expect(bs58.decode(prepared.message)).toEqual(
      new Uint8Array(decode(wire).transaction.messageBytes)
    );
  });
});
