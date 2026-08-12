/**
 * @vitest-environment node
 *
 * Compatibility matrix for the `window.salmon.publicKey` shim, executed against
 * the real @solana/web3.js as the oracle. Runs in node because web3.js's
 * instruction builders need the real `Buffer`.
 *
 * The last two cases are asserted as FAILURES on purpose: they are the
 * irreducible cost of dropping bn.js from page scope, and pinning them here
 * makes a future change that silently fixes or widens them visible.
 */
import { describe, expect, it } from 'vitest';
import bs58 from 'bs58';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
} from '@solana/web3.js';
import { toSalmonAddress } from './SalmonAddress';

const BLOCKHASH = '11111111111111111111111111111111';
const walletKeypair = Keypair.fromSeed(new Uint8Array(32).fill(2));
const walletBase58 = walletKeypair.publicKey.toBase58();
const shim = toSalmonAddress(walletBase58);

describe('SalmonAddress — patterns that work', () => {
  it('is a 32-byte Uint8Array holding the address bytes', () => {
    expect(shim).toBeInstanceOf(Uint8Array);
    expect(shim.length).toBe(32);
    expect(new Uint8Array(shim)).toEqual(walletKeypair.publicKey.toBytes());
  });

  it('supports new PublicKey(wallet.publicKey)', () => {
    expect(new PublicKey(shim).toBase58()).toBe(walletBase58);
  });

  it('supports new PublicKey(wallet.publicKey.toString())', () => {
    expect(new PublicKey(shim.toString()).toBase58()).toBe(walletBase58);
  });

  it('supports new PublicKey(wallet.publicKey.toBytes())', () => {
    expect(new PublicKey(shim.toBytes()).toBase58()).toBe(walletBase58);
  });

  it('supports SystemProgram.transfer({ fromPubkey: wallet.publicKey })', () => {
    const instruction = SystemProgram.transfer({
      fromPubkey: shim as unknown as PublicKey,
      toPubkey: Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey,
      lamports: 1,
    });
    expect(instruction.keys[0].pubkey.toBase58()).toBe(walletBase58);
  });

  it('supports compiling a v0 message with the wallet as fee payer', () => {
    const message = new TransactionMessage({
      payerKey: shim as unknown as PublicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: shim as unknown as PublicKey,
          toPubkey: Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();

    expect(message.staticAccountKeys[0].toBase58()).toBe(walletBase58);
  });

  it('supports PublicKey.findProgramAddressSync([wallet.publicKey.toBuffer()], …)', () => {
    const [derived] = PublicKey.findProgramAddressSync([shim.toBuffer()], SystemProgram.programId);
    const [expected] = PublicKey.findProgramAddressSync(
      [walletKeypair.publicKey.toBuffer()],
      SystemProgram.programId
    );
    expect(derived.toBase58()).toBe(expected.toBase58());
  });

  it('stringifies and serializes to base58', () => {
    expect(`${shim}`).toBe(walletBase58);
    expect(JSON.stringify({ publicKey: shim })).toBe(JSON.stringify({ publicKey: walletBase58 }));
  });

  it('supports wallet.publicKey.equals(other)', () => {
    expect(shim.equals(walletKeypair.publicKey)).toBe(true);
    expect(shim.equals(toSalmonAddress(walletBase58))).toBe(true);
    expect(shim.equals(Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey)).toBe(false);
  });

  it('rejects a malformed address exactly where new PublicKey() did', () => {
    expect(() => toSalmonAddress('not-a-valid-address')).toThrow();
  });
});

describe('SalmonAddress — known-irreducible failures (no bn.js in page scope)', () => {
  it('FAILS on other.equals(wallet.publicKey) — the real key reads its own _bn', () => {
    expect(() => walletKeypair.publicKey.equals(shim as unknown as PublicKey)).toThrow();
  });

  /**
   * Legacy `Transaction.compileMessage` locates the fee payer with
   * `uniqueMetas.findIndex((x) => x.pubkey.equals(feePayer))`. Every meta it
   * walks past is a real `PublicKey`, so the scan throws as soon as it compares
   * one against the shim. It only survives when the wallet key is the first
   * sorted meta — i.e. when the wallet is also a writable signer of an
   * instruction. v0 compilation is unaffected: it sorts through a base58 map.
   */
  it('FAILS on a legacy Transaction where the wallet is only the fee payer', () => {
    const other = Keypair.fromSeed(new Uint8Array(32).fill(3));
    const transaction = new Transaction({
      feePayer: shim as unknown as PublicKey,
      recentBlockhash: BLOCKHASH,
    }).add(
      SystemProgram.transfer({
        fromPubkey: other.publicKey,
        toPubkey: Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey,
        lamports: 1,
      })
    );

    expect(() => transaction.serializeMessage()).toThrow(/negative/);
  });

  it('happens to SURVIVE a legacy Transaction where the wallet sorts first', () => {
    const transaction = new Transaction({
      feePayer: shim as unknown as PublicKey,
      recentBlockhash: BLOCKHASH,
    }).add(
      SystemProgram.transfer({
        fromPubkey: shim as unknown as PublicKey,
        toPubkey: Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey,
        lamports: 1,
      })
    );

    expect(transaction.serializeMessage().length).toBeGreaterThan(0);
  });
});

describe('SalmonAddress — page tampering', () => {
  it('cannot be frozen, and every accessor survives an indexed write anyway', () => {
    // A typed array with elements rejects Object.freeze outright, so the
    // instance handed to page scope is writable by construction.
    expect(() => Object.freeze(toSalmonAddress(walletBase58))).toThrow(TypeError);

    const tampered = toSalmonAddress(walletBase58);
    tampered[0] = (tampered[0] + 1) % 256;

    expect(tampered.toBase58()).toBe(walletBase58);
    expect(tampered.toString()).toBe(walletBase58);
    expect(tampered.toJSON()).toBe(walletBase58);
    expect(tampered.toBytes()).toEqual(walletKeypair.publicKey.toBytes());
    expect(tampered.toBuffer()).toEqual(walletKeypair.publicKey.toBytes());
    expect(tampered.equals(walletKeypair.publicKey)).toBe(true);
  });
});

describe('SalmonAddress — wallet-standard read path', () => {
  it('exposes the address and bytes the adapter builds accounts from', () => {
    expect(shim.toBase58()).toBe(walletBase58);
    expect(shim.toBytes()).toEqual(bs58.decode(walletBase58));
    expect(shim.toBytes()).not.toBe(shim);
  });
});
