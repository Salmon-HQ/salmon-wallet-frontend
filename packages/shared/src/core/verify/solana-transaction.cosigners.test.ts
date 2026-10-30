/**
 * The exact signer set (spec 043 FR-042): with `coSigners`, the transaction's
 * signers are the fee payer first and then exactly those keys, no more, no
 * fewer, no repeats. Without it, the verifier answers as it always has.
 */
import { describe, expect, it } from 'vitest';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createTransactionMessage,
  generateKeyPairSigner,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';

import {
  assertSolanaTransactionMatches,
  SolanaTransactionMismatchError,
  type DeclaredTransactionEffects,
} from './solana-transaction';
import { SYSTEM_PROGRAM } from './solana-programs';

const BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash;

type Version = 0 | 'legacy';

interface Built {
  wire: string;
  messageBytes: Uint8Array;
}

/** A transaction paid by `payer` whose one System instruction names each account with its role. */
function build(
  version: Version,
  payer: Address,
  accounts: { address: Address; role: AccountRole }[]
): Built {
  let tx = setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: BLOCKHASH, lastValidBlockHeight: 1n },
    setTransactionMessageFeePayer(payer, createTransactionMessage({ version }))
  );
  tx = appendTransactionMessageInstruction(
    { programAddress: address(SYSTEM_PROGRAM), accounts, data: new Uint8Array([9]) } as never,
    tx
  ) as never;
  const messageBytes = new Uint8Array(
    getCompiledTransactionMessageEncoder().encode(compileTransactionMessage(tx) as never)
  );
  return { wire: toWire(messageBytes), messageBytes };
}

function toWire(messageBytes: Uint8Array): string {
  const compiled = getCompiledTransactionMessageDecoder().decode(messageBytes);
  const signers = compiled.staticAccounts.slice(0, compiled.header.numSignerAccounts);
  return Buffer.from(
    getTransactionEncoder().encode({
      messageBytes: messageBytes as never,
      signatures: Object.fromEntries(signers.map((s) => [s, null])) as never,
    })
  ).toString('base64');
}

/** The same message with its header's signer count moved by `delta`. */
function withSignerCount(built: Built, delta: number): string {
  const compiled = getCompiledTransactionMessageDecoder().decode(built.messageBytes);
  const patched = {
    ...compiled,
    header: { ...compiled.header, numSignerAccounts: compiled.header.numSignerAccounts + delta },
  };
  return toWire(new Uint8Array(getCompiledTransactionMessageEncoder().encode(patched as never)));
}

const signer = (a: Address) => ({ address: a, role: AccountRole.READONLY_SIGNER });
const plain = (a: Address) => ({ address: a, role: AccountRole.READONLY });

async function keys() {
  const [payer, k1, k2] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  return { payer: payer.address, k1: k1.address, k2: k2.address };
}

function check(wire: string, payer: Address, coSigners?: readonly string[]) {
  return () =>
    assertSolanaTransactionMatches(wire, {
      feePayer: String(payer),
      allowedPrograms: [SYSTEM_PROGRAM],
      ...(coSigners === undefined ? {} : { coSigners }),
    });
}

describe.each<Version>([0, 'legacy'])('coSigners, %s message', (version) => {
  it('accepts exactly {payer, k1}', async () => {
    const { payer, k1 } = await keys();
    const { wire } = build(version, payer, [signer(k1)]);
    expect(check(wire, payer, [k1])).not.toThrow();
  });

  it('refuses when k1 does not sign', async () => {
    const { payer, k1 } = await keys();
    expect(check(build(version, payer, [plain(k1)]).wire, payer, [k1])).toThrow(
      SolanaTransactionMismatchError
    );
    expect(check(build(version, payer, []).wire, payer, [k1])).toThrow(
      SolanaTransactionMismatchError
    );
  });

  it('refuses an extra signer', async () => {
    const { payer, k1, k2 } = await keys();
    const { wire } = build(version, payer, [signer(k1), signer(k2)]);
    expect(check(wire, payer, [k1])).toThrow(SolanaTransactionMismatchError);
  });

  it('refuses k1 swapped for another key', async () => {
    const { payer, k1, k2 } = await keys();
    const { wire } = build(version, payer, [signer(k2)]);
    expect(check(wire, payer, [k1])).toThrow(SolanaTransactionMismatchError);
  });

  it('refuses a duplicate key in the expected set', async () => {
    const { payer, k1, k2 } = await keys();
    const { wire } = build(version, payer, [signer(k1), signer(k2)]);
    expect(check(wire, payer, [k1, k1])).toThrow(SolanaTransactionMismatchError);
  });

  it('refuses the payer as a co-signer of its own transaction', async () => {
    const { payer, k1 } = await keys();
    const { wire } = build(version, payer, [signer(k1)]);
    expect(check(wire, payer, [payer])).toThrow(SolanaTransactionMismatchError);
  });

  it('refuses when the payer is not first', async () => {
    const { payer, k1 } = await keys();
    const { wire } = build(version, k1, [signer(payer)]);
    expect(check(wire, payer, [k1])).toThrow(SolanaTransactionMismatchError);
  });

  it('refuses numSignerAccounts off by one in either direction', async () => {
    const { payer, k1 } = await keys();
    const built = build(version, payer, [signer(k1)]);
    expect(check(withSignerCount(built, -1), payer, [k1])).toThrow(SolanaTransactionMismatchError);
    expect(check(withSignerCount(built, 1), payer, [k1])).toThrow(SolanaTransactionMismatchError);
  });

  it('without coSigners, accepts the same two-signer transaction as before', async () => {
    const { payer, k1 } = await keys();
    const { wire } = build(version, payer, [signer(k1)]);
    expect(check(wire, payer)).not.toThrow();
  });
});

describe('DeclaredTransactionEffects', () => {
  it('cannot state coSigners or feePayer', () => {
    // @ts-expect-error a flow never names the co-signers: core fills them from the keys it generated
    const withCoSigners: DeclaredTransactionEffects = { allowedPrograms: [], coSigners: [] };
    // @ts-expect-error a flow never names the payer: core fills it from the signing key
    const withPayer: DeclaredTransactionEffects = { allowedPrograms: [], feePayer: '' };
    expect([withCoSigners, withPayer]).toHaveLength(2);
  });
});
