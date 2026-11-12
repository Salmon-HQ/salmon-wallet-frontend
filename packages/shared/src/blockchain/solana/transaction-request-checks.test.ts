import { beforeAll, describe, expect, it, vi } from 'vitest';
import bs58 from 'bs58';
import {
  generateKeyPairSigner,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
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

  // A v1 message lays its instructions out as headers and payloads.
  it('a durable-nonce lifetime is refused in a v1 message too', async () => {
    const wire = await merchantWire({ version: 1, nonceAccount: stranger.address });
    expect(await prepareRefusal(wire)).toBe('staleOrWrongNetwork');
    expect(await signableRefusal(wire)).toBe('staleOrWrongNetwork');
  });

  it('core accepts the bytes a sponsor signed for this user', async () => {
    await expect(
      assertReceivedTransactionSignable(decode(await merchantWire()).transaction, user.address)
    ).resolves.toBeUndefined();
  });
});

describe('prepareMerchantTransaction — unsigned, the user pays', () => {
  const LATEST = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';
  let lookupTable: KeyPairSigner;

  beforeAll(async () => {
    lookupTable = await generateKeyPairSigner();
  });

  function userPaysRpc() {
    return {
      isBlockhashValid: vi.fn().mockReturnValue({ send: async () => ({ value: true }) }),
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: async () => ({ value: { blockhash: LATEST, lastValidBlockHeight: 500n } }),
      }),
      // The lookup table the v0 message reads the merchant's address from.
      getMultipleAccounts: vi.fn().mockReturnValue({
        send: async () => ({
          value: [
            {
              data: {
                parsed: {
                  type: 'lookupTable',
                  info: {
                    addresses: [merchant.address],
                    authority: sponsor.address,
                    deactivationSlot: '18446744073709551615',
                    lastExtendedSlot: '1',
                    lastExtendedSlotStartIndex: 0,
                  },
                },
                program: 'address-lookup-table',
                space: 88n,
              },
              executable: false,
              lamports: 1_000_000n,
              owner: 'AddressLookupTab1e1111111111111111111111111',
              space: 88n,
            },
          ],
        }),
      }),
    };
  }

  /** Each instruction as program, accounts (by address) and data: what the transaction does. */
  function instructionsOf(wire: string) {
    const { message } = decode(wire);
    const lookups =
      'addressTableLookups' in message && message.addressTableLookups?.length
        ? [merchant.address]
        : [];
    const keys = [...message.staticAccounts.map(String), ...lookups];
    if (!('instructions' in message)) throw new Error('legacy or v0 only');
    return message.instructions.map((instruction) => ({
      program: keys[instruction.programAddressIndex],
      accounts: (instruction.accountIndices ?? []).map((index) => keys[index]),
      data: Buffer.from(instruction.data ?? new Uint8Array()).toString('hex'),
    }));
  }

  it('changes only the blockhash when the user already pays the fee', async () => {
    const wire = await merchantWire({ feePayer: user.address, signWith: [] });
    const rpc = userPaysRpc();

    const prepared = await prepareMerchantTransaction(rpc as never, user.address, wire);

    const before = decode(wire);
    const expected = getCompiledTransactionMessageEncoder().encode({
      ...before.message,
      lifetimeToken: LATEST,
    } as never);
    expect(new Uint8Array(decode(prepared.wire).transaction.messageBytes)).toEqual(
      new Uint8Array(expected)
    );
    expect(prepared).toMatchObject({
      sponsored: false,
      feePayer: user.address,
      signer: user.address,
      lifetime: LATEST,
    });
    expect(decode(prepared.wire).transaction.signatures).toEqual({ [user.address]: null });
  });

  it.each([
    ['a legacy', 'legacy', false],
    ['a v0', 0, false],
    ['a v0 lookup-table', 0, true],
  ] as const)(
    'makes the user pay %s transaction someone else was named to pay',
    async (_, version, withLookupTable) => {
      const wire = await merchantWire({
        version,
        ...(withLookupTable ? { lookupTable: lookupTable.address } : {}),
        feePayer: sponsor.address,
        signWith: [],
      });
      const rpc = userPaysRpc();

      const prepared = await prepareMerchantTransaction(rpc as never, user.address, wire);

      expect(prepared).toMatchObject({
        sponsored: false,
        feePayer: user.address,
        lifetime: LATEST,
      });
      expect(decode(prepared.wire).message.staticAccounts[0]).toBe(user.address);
      expect(decode(prepared.wire).transaction.signatures).toEqual({ [user.address]: null });
      expect(instructionsOf(prepared.wire)).toEqual(instructionsOf(wire));
    }
  );

  it('refuses a transaction that would still need another party to sign', async () => {
    const wire = await merchantWire({
      feePayer: sponsor.address,
      cosigner: merchant.address,
      signWith: [],
    });
    expect(
      await prepareMerchantTransaction(userPaysRpc() as never, user.address, wire).catch(
        (error: TransactionRequestError) => error.reason
      )
    ).toBe('missingSignature');
  });
});
