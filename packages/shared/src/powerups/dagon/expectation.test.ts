/**
 * What a Dagon build may carry, checked against transactions shaped like the
 * backend's builders (salmon-wallet-backend, adapters/dagon/instructions.js):
 * each real action passes, and a build that adds a SOL or SPL Token
 * instruction, or names another payer, is refused before the user signs.
 */
import { describe, expect, it } from 'vitest';
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createTransactionMessage,
  getAddressDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';
import {
  assertSolanaTransactionMatches,
  COMPUTE_BUDGET_PROGRAM,
  SolanaTransactionMismatchError,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import devnet from './fixtures/devnet.json';
import { parseDagonConfig } from './config';
import { pcAccountAddress } from './chain';
import { ENCRYPT_PROGRAM, PC_SWAP_PROGRAM, PC_TOKEN_PROGRAM, type DagonAction } from './constants';
import { dagonExpectation } from './expectation';

const WALLET = 'EWTW7CHSVCNqnEikcxXJzFtGGZSRUevdfPfzavYc1bfX';
const OTHER = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
const CONFIG = parseDagonConfig(devnet)!;
const USDC = CONFIG.sides.USDC;
const DOGE = CONFIG.sides.DOGE;

const PROGRAMS = new Set([
  ENCRYPT_PROGRAM,
  PC_TOKEN_PROGRAM,
  PC_SWAP_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
]);
const filler = (n: number): string => getAddressDecoder().decode(new Uint8Array(32).fill(n));

type Ix = {
  programAddress: Address;
  accounts: { address: Address; role: number }[];
  data: Uint8Array;
};

/** `count` accounts, `named` placed at their index, a distinct filler elsewhere. */
function ix(
  program: string,
  data: number[],
  count: number,
  named: Record<number, string>,
  signers: number[] = []
): Ix {
  return {
    programAddress: address(program),
    accounts: Array.from({ length: count }, (_, index) => ({
      address: address(named[index] ?? filler(index + 1)),
      role: signers.includes(index) ? 3 : PROGRAMS.has(named[index] ?? '') ? 0 : 1,
    })),
    data: new Uint8Array(data),
  };
}

function transaction(instructions: Ix[], payer = WALLET): string {
  let msg = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash,
      lastValidBlockHeight: 1000n,
    },
    setTransactionMessageFeePayer(address(payer), createTransactionMessage({ version: 0 }))
  );
  for (const each of instructions)
    msg = appendTransactionMessageInstruction(each as never, msg) as never;
  const compiled = compileTransactionMessage(msg);
  const messageBytes = getCompiledTransactionMessageEncoder().encode(compiled);
  const signers = compiled.staticAccounts.slice(0, compiled.header.numSignerAccounts);
  return Buffer.from(
    getTransactionEncoder().encode({
      messageBytes: messageBytes as never,
      signatures: Object.fromEntries(signers.map((signer) => [signer, null])) as never,
    })
  ).toString('base64');
}

const budget = [
  ix(COMPUTE_BUDGET_PROGRAM, [2, 0, 0, 0, 0], 0, {}),
  ix(COMPUTE_BUDGET_PROGRAM, [3, 1, 0, 0, 0, 0, 0, 0, 0], 0, {}),
];
const amount = [0, 1, 0, 0, 0, 0, 0, 0];

/** The backend's top-level instructions per action, payer at the index its builder puts it. */
async function realBuild(action: DagonAction, payer = WALLET): Promise<Ix[]> {
  const usdcPc = await pcAccountAddress(USDC.pcMint, WALLET);
  const dogePc = await pcAccountAddress(DOGE.pcMint, WALLET);
  const otherPc = await pcAccountAddress(USDC.pcMint, OTHER);
  const tail = (at: number) => ({
    [at]: ENCRYPT_PROGRAM,
    [at + 4]: PC_TOKEN_PROGRAM,
    [at + 6]: payer,
    [at + 8]: SYSTEM_PROGRAM,
  });
  switch (action) {
    case 'setup':
      return [
        ix(
          ENCRYPT_PROGRAM,
          [14, 255, ...new Array(16).fill(0)],
          8,
          { 2: payer, 3: payer, 4: payer, 5: payer, 6: SYSTEM_PROGRAM, 7: SYSTEM_PROGRAM },
          [2, 3, 4, 5]
        ),
        ix(
          PC_TOKEN_PROGRAM,
          [1, 254, 253],
          13,
          { 0: usdcPc, 1: USDC.pcMint, 2: WALLET, ...tail(4) },
          [3, 10]
        ),
      ];
    case 'wrap':
      return [
        ix(
          PC_TOKEN_PROGRAM,
          [30, 253, ...amount],
          15,
          { 0: USDC.vault, 1: usdcPc, 3: USDC.vaultAta, ...tail(6), 14: TOKEN_PROGRAM },
          [5, 12]
        ),
      ];
    case 'reveal':
      return [ix(PC_TOKEN_PROGRAM, [40, 253], 13, { 0: usdcPc, 3: OTHER, ...tail(4) }, [2, 10])];
    case 'send':
      return [ix(PC_TOKEN_PROGRAM, [3, 253], 14, { 0: usdcPc, 1: otherPc, ...tail(5) }, [11])];
    case 'swap':
      return [
        ix(
          PC_SWAP_PROGRAM,
          [1, 252, 253, 0],
          26,
          {
            1: usdcPc,
            2: dogePc,
            15: ENCRYPT_PROGRAM,
            19: PC_SWAP_PROGRAM,
            21: PC_TOKEN_PROGRAM,
            23: payer,
            25: SYSTEM_PROGRAM,
          },
          [14, 23]
        ),
      ];
    case 'unwrapBurn':
      return [
        ix(
          PC_TOKEN_PROGRAM,
          [31, 250, 253, ...amount],
          15,
          { 0: USDC.vault, 1: usdcPc, ...tail(6) },
          [5, 12]
        ),
      ];
    case 'unwrapDecrypt':
      return [ix(PC_TOKEN_PROGRAM, [32, 253], 12, tail(3), [1, 9])];
    case 'unwrapComplete':
      return [
        ix(
          PC_TOKEN_PROGRAM,
          [33],
          9,
          { 1: USDC.vault, 2: USDC.pcMint, 4: USDC.vaultAta, 6: payer, 7: payer, 8: TOKEN_PROGRAM },
          [6]
        ),
      ];
  }
}

const SIDES: Record<DagonAction, ('USDC' | 'DOGE')[]> = {
  setup: ['USDC'],
  wrap: ['USDC'],
  reveal: ['USDC'],
  send: ['USDC'],
  swap: ['USDC', 'DOGE'],
  unwrapBurn: ['USDC'],
  unwrapDecrypt: ['USDC'],
  unwrapComplete: ['USDC'],
};

async function check(action: DagonAction, instructions: Ix[], payer = WALLET) {
  const effects = await dagonExpectation(action, {
    config: CONFIG,
    wallet: WALLET,
    sides: SIDES[action],
    counterparty: action === 'send' ? OTHER : undefined,
  });
  assertSolanaTransactionMatches(transaction(instructions, payer), { feePayer: payer, ...effects });
}

const ACTIONS = Object.keys(SIDES) as DagonAction[];
const SYSTEM_TRANSFER = ix(
  SYSTEM_PROGRAM,
  [2, 0, 0, 0, 0x40, 0x42, 0x0f, 0, 0, 0, 0, 0],
  2,
  { 0: WALLET, 1: OTHER },
  [0]
);
const TOKEN_APPROVE = ix(
  TOKEN_PROGRAM,
  [4, 0x40, 0x42, 0x0f, 0, 0, 0, 0, 0],
  3,
  { 1: OTHER, 2: WALLET },
  [2]
);
const TOKEN_SET_AUTHORITY = ix(
  TOKEN_PROGRAM,
  [6, 2, 1, ...new Array(32).fill(7)],
  2,
  { 1: WALLET },
  [1]
);

describe('dagonExpectation — what the backend builds per action', () => {
  it.each(ACTIONS)(
    'passes the real %s build, with and without a compute budget',
    async (action) => {
      await expect(check(action, await realBuild(action))).resolves.toBeUndefined();
      await expect(
        check(action, [...budget, ...(await realBuild(action))])
      ).resolves.toBeUndefined();
    }
  );

  it.each(ACTIONS)('refuses a %s build that appends SystemProgram::Transfer', async (action) => {
    await expect(
      check(action, [...(await realBuild(action)), SYSTEM_TRANSFER])
    ).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
  });

  it.each(ACTIONS)(
    'refuses a %s build that appends Token::Approve or SetAuthority',
    async (action) => {
      await expect(
        check(action, [...(await realBuild(action)), TOKEN_APPROVE])
      ).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
      await expect(
        check(action, [...(await realBuild(action)), TOKEN_SET_AUTHORITY])
      ).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
    }
  );

  it("refuses another action's instruction: a wrap build carrying an unwrap burn", async () => {
    await expect(check('wrap', await realBuild('unwrapBurn'))).rejects.toBeInstanceOf(
      SolanaTransactionMismatchError
    );
  });

  it('refuses a build whose Encrypt payer slot is another wallet', async () => {
    const build = await realBuild('wrap');
    build[0].accounts[12] = { address: address(OTHER), role: 3 };
    await expect(check('wrap', build)).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
  });

  it('refuses an unwrap completion paying another owner', async () => {
    const build = await realBuild('unwrapComplete');
    build[0].accounts[7] = { address: address(OTHER), role: 1 };
    await expect(check('unwrapComplete', build)).rejects.toBeInstanceOf(
      SolanaTransactionMismatchError
    );
  });

  it("refuses a wrap that never names the side's vault token account", async () => {
    const build = await realBuild('wrap');
    build[0].accounts[3] = { address: address(OTHER), role: 1 };
    await expect(check('wrap', build)).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
  });

  it('refuses a swap on another pair of pc-accounts', async () => {
    const build = await realBuild('swap');
    build[0].accounts[2] = { address: address(filler(99)), role: 1 };
    await expect(check('swap', build)).rejects.toBeInstanceOf(SolanaTransactionMismatchError);
  });
});
