import bs58 from 'bs58';
import {
  Keypair,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { describe, expect, it } from 'vitest';
import {
  encodeMwaAuthToken,
  isMwaAuthorizationValid,
  mwaChainToNetworkId,
  newMwaAuthToken,
  mwaIdentityOrigin,
  mwaPrecheck,
  toSignAllTransactionsRequest,
  toSignAndSendRequest,
  withSignature,
} from './mwa';

// TEST-ONLY keys: no funds, never used outside tests.
const payer = Keypair.fromSeed(new Uint8Array(32).fill(1));
const salmon = Keypair.fromSeed(new Uint8Array(32).fill(2));
const recipient = Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey;
const recentBlockhash = Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey.toBase58();
const transfer = SystemProgram.transfer({ fromPubkey: salmon.publicKey, toPubkey: recipient, lamports: 1 });

/** v0 transaction the dApp's co-signer (payer) already signed; Salmon's slot is empty. */
function coSignedV0() {
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash,
    instructions: [transfer],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([payer]);
  return tx;
}

describe('mwaChainToNetworkId', () => {
  it.each([
    ['solana:mainnet', 'solana-mainnet'],
    ['mainnet-beta', 'solana-mainnet'],
    ['solana:devnet', 'solana-devnet'],
    ['devnet', 'solana-devnet'],
  ])('maps %s to %s', (chain, networkId) => {
    expect(mwaChainToNetworkId(chain)).toBe(networkId);
  });

  it.each(['solana:testnet', 'testnet', 'ethereum:1', '', undefined])(
    'refuses %s',
    (chain) => {
      expect(mwaChainToNetworkId(chain)).toBeNull();
    }
  );
});

describe('mwaIdentityOrigin', () => {
  it('returns the origin of an https identity, as the extension keys trusted apps', () => {
    expect(mwaIdentityOrigin('https://jup.ag/swap?x=1')).toBe('https://jup.ag');
  });

  it('keeps a non-default port so two local dApps stay distinct', () => {
    expect(mwaIdentityOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it.each([undefined, '', 'not a url', 'javascript:alert(1)', 'solana-wallet:/v1'])(
    'refuses %s',
    (uri) => {
      expect(mwaIdentityOrigin(uri)).toBeNull();
    }
  );
});

describe('withSignature', () => {
  it("fills Salmon's slot and keeps the co-signer's signature (v0)", () => {
    const dAppTx = coSignedV0();
    const wire = dAppTx.serialize();
    const expected = coSignedV0();
    expected.sign([salmon]);
    const salmonSignature = bs58.encode(expected.signatures[1]);

    const out = withSignature(wire, salmon.publicKey.toBase58(), salmonSignature);

    expect(Buffer.from(out).equals(Buffer.from(expected.serialize()))).toBe(true);
  });

  it("fills Salmon's slot in a legacy transaction", () => {
    const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash }).add(transfer);
    tx.partialSign(payer);
    const wire = tx.serialize({ requireAllSignatures: false });
    tx.partialSign(salmon);

    const signature = bs58.encode(tx.signatures[1].signature!);
    const out = withSignature(wire, salmon.publicKey.toBase58(), signature);

    expect(Buffer.from(out).equals(tx.serialize())).toBe(true);
  });

  it('refuses a signer the transaction does not require', () => {
    const wire = coSignedV0().serialize();
    const stranger = Keypair.fromSeed(new Uint8Array(32).fill(9)).publicKey.toBase58();

    expect(() => withSignature(wire, stranger, bs58.encode(new Uint8Array(64)))).toThrow(/not a required signer/);
  });
});

describe('request builders', () => {
  it('turns wire transactions into the signAllTransactions request the approval path signs', () => {
    const tx = coSignedV0();

    const request = toSignAllTransactionsRequest('r1', [tx.serialize()]);

    expect(request).toEqual({
      id: 'r1',
      method: 'signAllTransactions',
      params: { messages: [bs58.encode(tx.message.serialize())] },
    });
  });

  it('carries the full transaction for sign-and-send so co-signer signatures survive', () => {
    const tx = coSignedV0();

    const request = toSignAndSendRequest('r2', tx.serialize(), { skipPreflight: true });

    expect(request).toEqual({
      id: 'r2',
      method: 'signAndSendTransaction',
      params: {
        message: bs58.encode(tx.message.serialize()),
        transaction: bs58.encode(tx.serialize()),
        options: { skipPreflight: true },
      },
    });
  });

  it('refuses bytes that are not a transaction', () => {
    expect(() => toSignAllTransactionsRequest('r3', [new Uint8Array([1, 2, 3])])).toThrow(/not a valid transaction/);
  });
});

describe('authorization token', () => {
  const address = salmon.publicKey.toBase58();

  it('issues a fresh 32-byte token each time', () => {
    const a = newMwaAuthToken();
    const b = newMwaAuthToken();
    expect(a).toHaveLength(32);
    expect(encodeMwaAuthToken(a)).not.toBe(encodeMwaAuthToken(b));
  });

  it('accepts the token stored for the same account', () => {
    const token = newMwaAuthToken();
    const app = { name: 'Jup', address, authToken: encodeMwaAuthToken(token) };
    expect(isMwaAuthorizationValid(app, address, token)).toBe(true);
  });

  it('refuses a different token, another account, a revoked app, or an extension-trusted site', () => {
    const token = newMwaAuthToken();
    const app = { address, authToken: encodeMwaAuthToken(token) };
    const other = payer.publicKey.toBase58();

    expect(isMwaAuthorizationValid(app, address, newMwaAuthToken())).toBe(false);
    expect(isMwaAuthorizationValid(app, other, token)).toBe(false);
    expect(isMwaAuthorizationValid(undefined, address, token)).toBe(false);
    expect(isMwaAuthorizationValid({ address }, address, token)).toBe(false);
  });
});

describe('mwaPrecheck', () => {
  const address = salmon.publicKey.toBase58();
  const origin = 'https://jup.ag';
  const token = new Uint8Array(32).fill(7);
  const ctx = {
    address,
    networkId: 'solana-mainnet',
    trustedApps: { [origin]: { address, authToken: encodeMwaAuthToken(token) } },
  };
  const sign = {
    authorize: false,
    chain: 'solana:mainnet',
    identityUri: origin,
    authorizationScope: token,
    payloadCount: 1,
  };

  it('lets an authorized request through with its origin and network', () => {
    expect(mwaPrecheck(sign, ctx)).toEqual({ ok: true, origin, networkId: 'solana-mainnet' });
  });

  it('refuses a network Salmon is not on, and says which', () => {
    expect(mwaPrecheck({ ...sign, chain: 'solana:devnet' }, ctx)).toEqual({
      ok: false,
      reason: 'network',
      requested: 'solana:devnet',
      failReason: 'USER_DECLINED',
    });
  });

  it('refuses a network Salmon does not support at all', () => {
    expect(mwaPrecheck({ ...sign, chain: 'solana:testnet' }, ctx)).toMatchObject({
      ok: false,
      reason: 'network',
    });
  });

  it('refuses a dApp that does not say who it is', () => {
    expect(mwaPrecheck({ ...sign, identityUri: undefined }, ctx)).toEqual({
      ok: false,
      reason: 'identity',
      failReason: 'USER_DECLINED',
    });
  });

  it('refuses a watch-only wallet, and says so', () => {
    expect(mwaPrecheck(sign, { ...ctx, address: null })).toEqual({
      ok: false,
      reason: 'watch-only',
      failReason: 'USER_DECLINED',
    });
  });

  it('refuses a token that was revoked or never issued', () => {
    expect(mwaPrecheck(sign, { ...ctx, trustedApps: {} })).toEqual({
      ok: false,
      failReason: 'AUTHORIZATION_NOT_VALID',
    });
  });

  it('refuses more payloads than Salmon advertises', () => {
    expect(mwaPrecheck({ ...sign, payloadCount: 11 }, ctx)).toEqual({
      ok: false,
      failReason: 'TOO_MANY_PAYLOADS',
    });
  });

  it('does not ask a connect request for a token it cannot have yet', () => {
    const authorize = { authorize: true, chain: 'solana:mainnet', identityUri: origin };
    expect(mwaPrecheck(authorize, { ...ctx, trustedApps: {} })).toEqual({
      ok: true,
      origin,
      networkId: 'solana-mainnet',
    });
  });
});
