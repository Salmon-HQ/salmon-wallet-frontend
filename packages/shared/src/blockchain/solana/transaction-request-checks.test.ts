import { beforeAll, describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import {
  generateKeyPairSigner,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';
import {
  assertReceivedTransactionSignable,
  prepareMerchantTransaction,
} from './transaction-request-checks';
import { TransactionRequestError, type TransactionRequestRefusal } from './transaction-request';
import {
  MERCHANT_BLOCKHASH,
  sponsoredMerchantTransaction,
} from '../../test-utils/solana-pay-merchant';

let sponsor: KeyPairSigner;
let user: KeyPairSigner;
let merchant: KeyPairSigner;
let stranger: KeyPairSigner;

beforeAll(async () => {
  [sponsor, user, merchant, stranger] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
});

/** Why `prepareMerchantTransaction` refuses these bytes for `signer`. */
async function prepareRefusal(
  wire: string,
  { valid = true, signer = user.address }: { valid?: boolean; signer?: Address } = {}
): Promise<TransactionRequestRefusal> {
  try {
    await prepareMerchantTransaction(rpcWithValidBlockhash(valid) as never, signer, wire);
  } catch (error) {
    expect(error).toBeInstanceOf(TransactionRequestError);
    return (error as TransactionRequestError).reason;
  }
  throw new Error('expected a refusal');
}

/** Why core's last check refuses the same bytes, right before the key is used. */
async function signableRefusal(wire: string): Promise<TransactionRequestRefusal> {
  try {
    await assertReceivedTransactionSignable(decode(wire).transaction, user.address);
  } catch (error) {
    expect(error).toBeInstanceOf(TransactionRequestError);
    return (error as TransactionRequestError).reason;
  }
  throw new Error('expected a refusal');
}

function merchantWire(overrides: Record<string, unknown> = {}) {
  return sponsoredMerchantTransaction({
    version: 0,
    sponsor,
    user: user.address,
    merchant: merchant.address,
    ...overrides,
  });
}

/** One byte of the base64 wire changed at `offset`. */
function flipByte(wire: string, offset: number): string {
  const bytes = Buffer.from(wire, 'base64');
  bytes[offset] ^= 0xff;
  return bytes.toString('base64');
}

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

describe('prepareMerchantTransaction — refusals', () => {
  it.each([
    ['text that is not base64', '%%%%'],
    ['bytes that are not a transaction', Buffer.from([1, 2, 3]).toString('base64')],
  ])('%s is a malformed transaction', async (_, wire) => {
    expect(await prepareRefusal(wire)).toBe('malformedTransaction');
  });

  it('a transaction over the network size limit is malformed', async () => {
    expect(await prepareRefusal(await merchantWire({ memoBytes: 1300 }))).toBe(
      'malformedTransaction'
    );
  });

  it('a message version the wallet cannot read is malformed', async () => {
    const wire = await merchantWire();
    // One signature slot per signer, then the message; its first byte is the version.
    const signatureCount = Buffer.from(wire, 'base64')[0];
    const versionOffset = 1 + 64 * signatureCount;
    const bytes = Buffer.from(wire, 'base64');
    bytes[versionOffset] = 0x80 | 0x05;
    expect(await prepareRefusal(bytes.toString('base64'))).toBe('malformedTransaction');
  });

  it('a sponsor signature with one byte changed does not verify', async () => {
    // The sponsor (fee payer) signs first: its signature starts after the count byte.
    const wire = flipByte(await merchantWire(), 1);
    expect(await prepareRefusal(wire)).toBe('invalidSignature');
    expect(await signableRefusal(wire)).toBe('invalidSignature');
  });

  it("an empty sponsor slot beside another party's signature is missing a signature", async () => {
    const wire = await merchantWire({
      cosigner: merchant.address,
      signWith: [merchant.keyPair],
    });
    expect(await prepareRefusal(wire)).toBe('missingSignature');
    expect(await signableRefusal(wire)).toBe('missingSignature');
  });

  it("a co-signer's empty slot is missing a signature", async () => {
    const wire = await merchantWire({ cosigner: merchant.address });
    expect(await prepareRefusal(wire)).toBe('missingSignature');
    expect(await signableRefusal(wire)).toBe('missingSignature');
  });

  it("a transaction that does not ask for the user's signature is not for this account", async () => {
    const wire = await merchantWire({ user: stranger.address });
    expect(await prepareRefusal(wire)).toBe('notForThisAccount');
    expect(await signableRefusal(wire)).toBe('notForThisAccount');
  });

  it('a transaction whose user slot is already filled is refused', async () => {
    const wire = await merchantWire({ signWith: [sponsor.keyPair, user.keyPair] });
    expect(await prepareRefusal(wire)).toBe('alreadySigned');
    expect(await signableRefusal(wire)).toBe('alreadySigned');
  });

  it('a blockhash the active network does not accept is stale or for another network', async () => {
    expect(await prepareRefusal(await merchantWire(), { valid: false })).toBe(
      'staleOrWrongNetwork'
    );
  });

  it('a durable-nonce lifetime is refused, whatever the network says of it', async () => {
    const wire = await merchantWire({ nonceAccount: stranger.address });
    expect(await prepareRefusal(wire)).toBe('staleOrWrongNetwork');
    expect(await signableRefusal(wire)).toBe('staleOrWrongNetwork');
  });

  it('core accepts the bytes a sponsor signed for this user', async () => {
    await expect(
      assertReceivedTransactionSignable(decode(await merchantWire()).transaction, user.address)
    ).resolves.toBeUndefined();
  });
});
