/**
 * @vitest-environment jsdom
 *
 * `requestFreshSignature` (spec 043 FR-040..FR-045, SC-004, SC-005): core
 * refuses before any key exists unless the Powerup declared the capability on
 * devnet, checks the build names exactly the keys it generated, signs them
 * only after the user confirms, and never lets a key out.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createSignerFromKeyPair,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getPublicKeyFromAddress,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  verifySignature,
  type Address,
  type Blockhash,
  type KeyPairSigner,
  type SignatureBytes,
} from '@solana/kit';

import {
  SignatureRequestProvider,
  useRequestFreshSignature,
  useSignatureRequestContext,
} from './SignatureRequestContext';
import {
  FreshSignersRefusedError,
  NoSigningAccountError,
  SignatureRequestCancelledError,
  type FreshSignatureRequest,
  type FreshSignerKeys,
  type SignedResult,
  type TransactionProposal,
} from './types';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import { SolanaTransactionMismatchError, SYSTEM_PROGRAM, TOKEN_PROGRAM } from '../verify';
import { encodeReadMessage, generateFreshSigners } from '../signing/fresh-signers';

vi.mock('../signing/fresh-signers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../signing/fresh-signers')>();
  return { ...actual, generateFreshSigners: vi.fn(actual.generateFreshSigners) };
});

const BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash;

/** An unsigned v0 transaction paid by `payer` with each of `signers` as a signer. */
function transaction(payer: Address, signers: readonly string[], program = SYSTEM_PROGRAM) {
  let message = setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: BLOCKHASH, lastValidBlockHeight: 1n },
    setTransactionMessageFeePayer(payer, createTransactionMessage({ version: 0 }))
  );
  message = appendTransactionMessageInstruction(
    {
      programAddress: address(program),
      accounts: signers.map((s) => ({ address: address(s), role: AccountRole.READONLY_SIGNER })),
      data: new Uint8Array([9]),
    } as never,
    message
  ) as never;
  return getBase64EncodedWireTransaction(compileTransaction(message as never));
}

interface Harness {
  user: KeyPairSigner;
  account: { signer: KeyPairSigner; getRpc: () => never; getRpcSubscriptions: () => never };
  signProposal: ReturnType<typeof vi.fn>;
  props: {
    account: Harness['account'] | null;
    freshSigning?: { powerupIds: readonly string[]; networkId: string | null };
  };
}

let h: Harness;

beforeEach(async () => {
  vi.mocked(generateFreshSigners).mockClear();
  const real = await generateKeyPairSigner();
  const user = { ...real, signMessages: vi.fn(real.signMessages) } as KeyPairSigner;
  const account = {
    signer: user,
    getRpc: () => ({}) as never,
    getRpcSubscriptions: () => ({}) as never,
  };
  h = {
    user,
    account,
    signProposal: vi.fn(async () => ({ signature: 'sig-1' })),
    props: { account, freshSigning: { powerupIds: ['dagon'], networkId: 'solana-devnet' } },
  };
});

afterEach(() => vi.restoreAllMocks());

function render() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SignatureRequestProvider
      account={h.props.account as never}
      signProposal={h.signProposal as never}
      freshSigning={h.props.freshSigning}
    >
      {children}
    </SignatureRequestProvider>
  );
  return renderHook(
    () => ({ ctx: useSignatureRequestContext(), requestFresh: useRequestFreshSignature() }),
    { wrapper }
  );
}

function proposalFor(
  keys: FreshSignerKeys,
  overrides: Partial<TransactionProposal> = {}
): TransactionProposal {
  return {
    id: `p-${Math.random()}`,
    networkId: 'solana-devnet',
    transaction: transaction(h.user.address, keys.freshSigners),
    expect: { allowedPrograms: [SYSTEM_PROGRAM] },
    display: { title: 'Review', rows: [], pendingTitle: 'Processing' },
    ...overrides,
  };
}

function request(overrides: Partial<FreshSignatureRequest> = {}): FreshSignatureRequest {
  return {
    powerupId: 'dagon',
    networkId: 'solana-devnet',
    count: 1,
    build: vi.fn(async (keys: FreshSignerKeys) => proposalFor(keys)),
    ...overrides,
  };
}

/** Starts a request and waits until it is parked or settled. */
async function start(view: ReturnType<typeof render>, req: FreshSignatureRequest) {
  let settled = false;
  let result!: Promise<SignedResult>;
  act(() => {
    result = view.result.current.requestFresh(req);
  });
  result.then(
    () => (settled = true),
    () => (settled = true)
  );
  await waitFor(() => expect(settled || view.result.current.ctx.pending !== null).toBe(true));
  return { result };
}

async function confirm(view: ReturnType<typeof render>) {
  await act(async () => {
    await view.result.current.ctx.confirm();
  });
}

/** The request is no longer parked: a plain request is accepted rather than refused as busy. */
async function expectNotParked(view: ReturnType<typeof render>) {
  expect(view.result.current.ctx.pending).toBeNull();
  let second!: Promise<SignedResult>;
  act(() => {
    second = view.result.current.ctx.requestSignature(proposalFor({ freshSigners: [] }));
    second.catch(() => undefined);
  });
  expect(view.result.current.ctx.pending).not.toBeNull();
  act(() => view.result.current.ctx.cancel());
  await expect(second).rejects.toBeInstanceOf(SignatureRequestCancelledError);
}

describe('requestFreshSignature refuses before any key exists', () => {
  it.each<[string, () => void, Partial<FreshSignatureRequest>, string]>([
    [
      'the provider lacks the capability',
      () => (h.props.freshSigning = undefined),
      {},
      'undeclared',
    ],
    ['the id is not declared', () => undefined, { powerupId: 'payments' }, 'undeclared'],
    ['the request is on mainnet', () => undefined, { networkId: 'solana-mainnet' }, 'network'],
    [
      'the wallet is on mainnet',
      () => (h.props.freshSigning = { powerupIds: ['dagon'], networkId: 'solana-mainnet' }),
      {},
      'network',
    ],
    [
      'the wallet has no network',
      () => (h.props.freshSigning = { powerupIds: ['dagon'], networkId: null }),
      {},
      'network',
    ],
    ['count is 2', () => undefined, { count: 2 }, 'count'],
    ['count is -1', () => undefined, { count: -1 }, 'count'],
    ['count is 1.5', () => undefined, { count: 1.5 }, 'count'],
    ['a viewer is asked with count 0', () => undefined, { count: 0, viewer: true }, 'count'],
  ])('when %s', async (_name, arrange, overrides, reason) => {
    arrange();
    const view = render();
    const req = request(overrides);

    const { result } = await start(view, req);

    await expect(result).rejects.toBeInstanceOf(FreshSignersRefusedError);
    await expect(result).rejects.toMatchObject({
      reason,
      message: 'transaction.errors.buildFailed',
    });
    expect(generateFreshSigners).not.toHaveBeenCalled();
    expect(req.build).not.toHaveBeenCalled();
  });

  it('when another request is parked', async () => {
    const view = render();
    act(() => {
      void view.result.current.ctx
        .requestSignature(proposalFor({ freshSigners: [] }))
        .catch(() => undefined);
    });
    const req = request();

    await expect((await start(view, req)).result).rejects.toThrow(
      'transaction.errors.confirmationBusy'
    );
    expect(generateFreshSigners).not.toHaveBeenCalled();
  });

  it('when the account is watch-only', async () => {
    h.props.account = null;
    const view = render();
    const req = request();

    await expect((await start(view, req)).result).rejects.toBeInstanceOf(NoSigningAccountError);
    expect(generateFreshSigners).not.toHaveBeenCalled();
  });
});

describe('requestFreshSignature checks the build before parking', () => {
  it('rejects with the Powerup’s own error when the build throws', async () => {
    const view = render();
    const own = new Error('powerup.dagon.errors.setup_required');

    const { result } = await start(
      view,
      request({ build: vi.fn(async () => Promise.reject(own)) })
    );

    await expect(result).rejects.toBe(own);
    await expectNotParked(view);
  });

  it.each<[string, (keys: FreshSignerKeys, other: string) => Partial<TransactionProposal>]>([
    [
      'a signer other than the fresh one',
      (_k, other) => ({ transaction: transaction(h.user.address, [other]) }),
    ],
    [
      'an extra signer',
      (k, other) => ({ transaction: transaction(h.user.address, [...k.freshSigners, other]) }),
    ],
    [
      'a different fee payer',
      (k, other) => ({ transaction: transaction(address(other), k.freshSigners) }),
    ],
    ['another network', () => ({ networkId: 'solana-mainnet' })],
    [
      'a program outside expect.allowedPrograms',
      () => ({ expect: { allowedPrograms: [TOKEN_PROGRAM] } }),
    ],
  ])('refuses %s', async (_name, change) => {
    const { address: other } = await generateKeyPairSigner();
    const view = render();
    const req = request({
      build: vi.fn(async (keys: FreshSignerKeys) => proposalFor(keys, change(keys, other))),
    });

    await expect((await start(view, req)).result).rejects.toBeInstanceOf(
      SolanaTransactionMismatchError
    );
    await expectNotParked(view);
  });
});

describe('requestFreshSignature after parking', () => {
  it('rejects SignatureRequestCancelledError on cancel and drops the request', async () => {
    const view = render();
    const { result } = await start(view, request());

    act(() => view.result.current.ctx.cancel());

    await expect(result).rejects.toBeInstanceOf(SignatureRequestCancelledError);
    await expectNotParked(view);
  });

  it('refuses at confirm when the wallet moved to mainnet during review', async () => {
    const view = render();
    const { result } = await start(view, request());

    h.props.freshSigning = { powerupIds: ['dagon'], networkId: 'solana-mainnet' };
    view.rerender();
    await confirm(view);

    await expect(result).rejects.toMatchObject({ reason: 'network' });
    expect(h.signProposal).not.toHaveBeenCalled();
    await expectNotParked(view);
  });

  it('rejects SolanaOutcomeUnknownError on close when the outcome is unknown', async () => {
    h.signProposal.mockRejectedValueOnce(new SolanaOutcomeUnknownError('sig-x' as never));
    const view = render();
    const { result } = await start(view, request());

    await confirm(view);
    expect(view.result.current.ctx.pending?.unresolved).toBe(true);
    act(() => view.result.current.ctx.cancel());

    await expect(result).rejects.toBeInstanceOf(SolanaOutcomeUnknownError);
    await expectNotParked(view);
  });

  it('keeps the request and its keys parked for a retry after a retryable failure', async () => {
    h.signProposal.mockRejectedValueOnce(new Error('transaction.errors.sendFailed'));
    const view = render();
    const req = request();
    const { result } = await start(view, req);

    await confirm(view);
    expect(view.result.current.ctx.pending?.error).toBe('transaction.errors.sendFailed');
    await confirm(view);
    act(() => view.result.current.ctx.dismissReceipt());

    await expect(result).resolves.toEqual({ signature: 'sig-1' });
    const [keys] = vi.mocked(req.build).mock.calls[0];
    for (const call of h.signProposal.mock.calls) {
      expect(call[0]).toBe(h.account);
      expect((call[2] as KeyPairSigner[]).map((s) => String(s.address))).toEqual(keys.freshSigners);
    }
    expect(h.signProposal).toHaveBeenCalledTimes(2);
  });

  it('rebuilds on refresh with the same public keys', async () => {
    const view = render();
    const req = request();
    await start(view, req);
    const before = view.result.current.ctx.pending?.proposal.id;

    await act(async () => {
      await view.result.current.ctx.refresh();
    });

    expect(req.build).toHaveBeenCalledTimes(2);
    expect(vi.mocked(req.build).mock.calls[1][0]).toEqual(vi.mocked(req.build).mock.calls[0][0]);
    expect(view.result.current.ctx.pending?.proposal.id).not.toBe(before);
    expect(view.result.current.ctx.pending?.error).toBeNull();
  });

  it('resolves only the signature without a viewer', async () => {
    const view = render();
    const { result } = await start(view, request());

    await confirm(view);
    act(() => view.result.current.ctx.dismissReceipt());

    expect(await result).toEqual({ signature: 'sig-1' });
    await expectNotParked(view);
  });

  it('with a viewer, resolves the read authorization naming the fresh signer', async () => {
    const view = render();
    const req = request({ viewer: true });
    const { result } = await start(view, req);

    await confirm(view);
    act(() => view.result.current.ctx.dismissReceipt());

    const { signature, readAuthorization } = await result;
    const [keys] = vi.mocked(req.build).mock.calls[0];
    expect(signature).toBe('sig-1');
    expect(keys.viewer).toBeDefined();
    expect(readAuthorization?.message).toEqual(encodeReadMessage(address(keys.freshSigners[0])));
    expect(readAuthorization?.signer).toEqual(
      new Uint8Array(getAddressEncoder().encode(address(keys.viewer as string)))
    );
    expect(
      await verifySignature(
        await getPublicKeyFromAddress(address(keys.viewer as string)),
        readAuthorization?.signature as SignatureBytes,
        readAuthorization?.message as Uint8Array
      )
    ).toBe(true);
    expect(h.signProposal).toHaveBeenCalledWith(h.account, expect.anything(), [
      expect.objectContaining({ address: keys.freshSigners[0] }),
    ]);
    expect(h.user.signMessages).not.toHaveBeenCalled();
  });
});

describe('no key leaves core', () => {
  /** Every value reachable from `root`, objects and arrays walked deeply. */
  function* walk(root: unknown, seen = new Set<unknown>()): Generator<unknown> {
    yield root;
    if (root === null || typeof root !== 'object' || seen.has(root)) return;
    seen.add(root);
    if (ArrayBuffer.isView(root)) return;
    for (const value of Object.values(root)) yield* walk(value, seen);
  }

  function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
    outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
      for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
      return true;
    }
    return false;
  }

  function assertNoKeyMaterial(value: unknown, secrets: Uint8Array[]) {
    for (const node of walk(value)) {
      expect(node).not.toBeInstanceOf(CryptoKey);
      if (node && typeof node === 'object') {
        expect(node).not.toHaveProperty('keyPair');
        expect(typeof (node as { signTransactions?: unknown }).signTransactions).not.toBe(
          'function'
        );
        expect(typeof (node as { signMessages?: unknown }).signMessages).not.toBe('function');
      }
      if (node instanceof Uint8Array) {
        for (const secret of secrets) expect(contains(node, secret)).toBe(false);
      }
    }
  }

  it('hands out public keys only, writes nothing and logs nothing key-shaped', async () => {
    // Extractable stand-ins, so the test can know each secret and look for it.
    const secrets: Uint8Array[] = [];
    vi.mocked(generateFreshSigners).mockImplementation(async (count: number) =>
      Promise.all(
        Array.from({ length: count }, async () => {
          const keyPair = (await crypto.subtle.generateKey('Ed25519', true, [
            'sign',
            'verify',
          ])) as CryptoKeyPair;
          const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
          secrets.push(pkcs8.slice(-32));
          return createSignerFromKeyPair(keyPair);
        })
      )
    );
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined)
    );
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const view = render();
    const req = request({ viewer: true });

    const { result } = await start(view, req);
    await confirm(view);
    act(() => view.result.current.ctx.dismissReceipt());
    const resolved = await result;

    expect(secrets).toHaveLength(2);
    assertNoKeyMaterial(vi.mocked(req.build).mock.calls, secrets);
    assertNoKeyMaterial(resolved, secrets);
    for (const spy of consoles) assertNoKeyMaterial(spy.mock.calls, secrets);
    expect(setItem).not.toHaveBeenCalled();
    expect(h.user.signMessages).not.toHaveBeenCalled();
  });
});
