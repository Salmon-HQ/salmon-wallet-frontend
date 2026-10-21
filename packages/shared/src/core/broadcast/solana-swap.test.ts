import { describe, expect, it, vi } from 'vitest';
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';
import { signAndSendSolanaTransaction } from './solana';
import {
  JUPITER_AGGREGATOR_PROGRAM,
  MEMO_PROGRAM,
  SolanaTransactionMismatchError,
  ZEROEX_SETTLER_PROGRAM,
  type SwapRouteExpectation,
} from '../verify';
import { previewTransactionEffects } from '../../blockchain/solana/simulation';

vi.mock('../../blockchain/solana/simulation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  previewTransactionEffects: vi.fn(),
}));

const ATTACKER = 'DjqW361S9LFPpgwTbjuVa993ZGsk2U7AeXpiptNDpcBq';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL = 'So11111111111111111111111111111111111111112';

async function setup(router: string) {
  const signer = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(1), false);
  const payer = signer.address;
  let msg = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash,
      lastValidBlockHeight: 1n,
    },
    setTransactionMessageFeePayer(payer, createTransactionMessage({ version: 0 }))
  );
  msg = appendTransactionMessageInstruction(
    {
      programAddress: address(router),
      accounts: [
        { address: address(ATTACKER), role: 1 },
        { address: payer, role: 3 },
      ],
      data: new Uint8Array(8),
    } as never,
    msg
  ) as never;
  const messageBytes = getCompiledTransactionMessageEncoder().encode(
    compileTransactionMessage(msg)
  );
  const tx = Buffer.from(
    getTransactionEncoder().encode({
      messageBytes: messageBytes as never,
      signatures: { [payer]: null } as never,
    })
  ).toString('base64');
  const rpc = {
    getLatestBlockhash: vi.fn(),
    sendTransaction: vi.fn(),
  };
  const account = {
    signer,
    getRpc: () => rpc as never,
    getRpcSubscriptions: () => ({}) as never,
  };
  const swapRoute: SwapRouteExpectation = {
    sources: [],
    destinations: [],
    inputMint: SOL,
    outputMint: USDC,
    inAmount: '10000000',
    quotedOutAmount: '1173138',
    minOutAmount: '1167273',
    slippageBps: 50,
    platformFeeBps: 0,
  };
  const expectation = {
    feePayer: String(payer),
    allowedPrograms: [router],
    swapRoute,
  };
  return { tx, rpc, account, expectation, payer };
}

describe('signAndSendSolanaTransaction — a swap is simulated before it is signed', () => {
  it('refuses, without sending, a 0x swap whose output never reaches the wallet', async () => {
    const { tx, rpc, account, expectation, payer } = await setup(ZEROEX_SETTLER_PROGRAM);
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce({
      kind: 'effects',
      account: payer as Address,
      sol: { lamports: -10_005_000n, feeLamports: 5_000n },
      tokens: [],
      approvals: [],
    });

    await expect(signAndSendSolanaTransaction(account, tx, expectation)).rejects.toThrow(
      SolanaTransactionMismatchError
    );
    expect(previewTransactionEffects).toHaveBeenCalledWith(rpc, tx, payer);
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it('runs the byte check before any simulation', async () => {
    vi.mocked(previewTransactionEffects).mockClear();
    const { tx, account, expectation } = await setup(JUPITER_AGGREGATOR_PROGRAM);

    // The byte check refuses this route (data is no swap route) before any simulation.
    await expect(signAndSendSolanaTransaction(account, tx, expectation)).rejects.toThrow(
      /other than a swap route/
    );
    expect(previewTransactionEffects).not.toHaveBeenCalled();
  });

  // The byte check binds what it can read; the simulation catches what it
  // cannot — a debit of another token or an approval made inside the route —
  // whichever provider built the swap.
  it('simulates a swap that invokes no 0x program too', async () => {
    const { tx, rpc, account, expectation, payer } = await setup(MEMO_PROGRAM);
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce({
      kind: 'effects',
      account: payer as Address,
      sol: { lamports: -5_000n, feeLamports: 5_000n },
      tokens: [{ mint: ATTACKER as Address, amount: -1n } as never],
      approvals: [],
    });

    await expect(signAndSendSolanaTransaction(account, tx, expectation)).rejects.toThrow(
      /takes .* from the wallet/
    );
    expect(previewTransactionEffects).toHaveBeenCalledWith(rpc, tx, payer);
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });
});
