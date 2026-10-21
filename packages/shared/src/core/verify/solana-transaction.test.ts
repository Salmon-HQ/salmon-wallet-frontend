import { describe, expect, it } from 'vitest';
import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
} from '@solana/kit';
import {
  assertSolanaTransactionMatches,
  bubblegumAssets,
  SolanaTransactionMismatchError,
} from './solana-transaction';
import {
  ADDRESS_LOOKUP_TABLE_PROGRAM,
  ASSOCIATED_TOKEN_PROGRAM,
  BUBBLEGUM_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  LOOKUP_TABLE_STEP_INSTRUCTIONS,
  LOOKUP_TABLE_STEP_PROGRAMS,
  NFT_TRANSACTION_INSTRUCTIONS,
  NFT_TRANSACTION_PROGRAMS,
  SYSTEM_PROGRAM,
  TOKEN_METADATA_PROGRAM,
  TOKEN_PROGRAM,
} from './solana-programs';

/** The owner that pays and signs in both fixtures. */
const OWNER = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
/** A second account the no-lookup fixture names. */
const NAMED = 'So11111111111111111111111111111111111111112';

/**
 * A v0 transaction with one System-program instruction and no table lookups,
 * so its static list is the whole account set and absence proves something.
 */
const NO_LOOKUPS =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQACA4qI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOMy2vkvq+zotj/3pEAF5f39mvoVh1a2HFqV+QSzuNCBAQICAAEEAgAAAAA=';

/** The same shape with one address-table lookup (shared with core/broadcast). */
const WITH_LOOKUPS =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

describe('assertSolanaTransactionMatches', () => {
  it('accepts a transaction whose payer and programs are the declared ones', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
      })
    ).not.toThrow();
  });

  it('refuses a transaction that pays from another account', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: NAMED,
        allowedPrograms: [SYSTEM_PROGRAM],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });

  // A System transfer appended to an NFT transaction would empty the wallet's
  // SOL, and nothing on the confirmation screen would show it — the screen is
  // drawn from the response's own fields.
  it('refuses a System transfer appended to an NFT transaction', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: NFT_TRANSACTION_PROGRAMS,
        allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
      })
    ).toThrow(/invokes 11111111111111111111111111111111/);
  });

  it('leaves a program the flow did not bind to the program list alone', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        allowedInstructions: { [TOKEN_METADATA_PROGRAM]: { width: 1, codes: [] } },
      })
    ).not.toThrow();
  });

  it('accepts an instruction the flow does use', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        allowedInstructions: { [SYSTEM_PROGRAM]: { width: 4, codes: [2] } },
      })
    ).not.toThrow();
  });

  it('refuses a program the flow did not declare', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(/invokes 11111111111111111111111111111111/);
  });

  it('requires the accounts the flow named', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [NAMED],
      })
    ).not.toThrow();

    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(/does not name/);
  });

  // The static list is partial here, so a missing account proves nothing —
  // which makes the requirement undecidable, not satisfied. Returning as if it
  // held let the message's own author decide whether the check ran: including
  // any lookup entry switched it off, silently.
  it('refuses rather than skips when a table hides a required account', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [NAMED],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });

  it('still passes when the table is present but the required account is named anyway', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [OWNER],
      })
    ).not.toThrow();
  });

  it('still refuses an undeclared program when a table is in play', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });
});

/** A devnet compressed NFT, and the unsigned Bubblegum V2 burn and transfer built for it. */
const CNFT_OWNER = '7Q3Hm2QkDLJyy727sNc2AeH2vZxiPgWWXX6vTq8Ras6n';
const CNFT_ASSET = 'wHK2nJLzSSi6BQNfPa9w58h5coizP5P8Ga7HnCpfxL3';
const CNFT_RECIPIENT = '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3';
const CNFT_BURN =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAJDF8NEXtutZJGVXDVDJs/epFozMsVUg0imeV+RH3Rc05f/EU1F/1ZT1CahVT/oPtPqWf4kgNjgJpkisf+CCS2U3zxkf1HhKlL2P10L5bapMglSUIiTtR06p7VDcSOx9xpaZiLgOt5NShpsiR0X1ndv4omWMoT3GiBISY1HK4HwaWlC3lZig+vKLD70iVjIzNBS9A6qyQPcDLR3kdXoKxdxgYLbgFTI0klxAfxgVZ2/NMs9aSPbosWmTdWJLvNXhRyy69UqxC9l6VCoJ73s5iJ3QzTlKTM6d+mzcl+vi0jW6dIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACtMii2dvfTzUKEpUQ/F/GWKzbkkbMKQLJAWEnll7pftbTBGVGVfG+PZCxK9hzWskZA/sbcf8YH7oIGqZ6SQQ0wId25o1aBXD+sECa23sXfMSSvuttIXJulo+M5igS3uoXlh2mzKhvq8eonN1pECVoNH7Zkzi3TWOf8v7eMJqGTRBz2xhwP8Ov3pvc94shXOeteezAplVqpTi7L7OfGsfFJAQMRAQAAAAMCAwMEBQYHBwgJCguXAXPSIvDoj7cQEHOa5hYwxWPKxtrMaZHFRkLV4v6aTpyjfRLD1KCOWQ6l/r73PLxUCovDSvP7o1TZ5Xcin0fnmk4R/yPxf9X46sXSRgGG9yM8kn59stzHA8DlALZTyoInO3v62ARdhaRwAcXSRgGG9yM8kn59stzHA8DlALZTyoInO3v62ARdhaRwAQAAAAAAAAAAAAAAAAAA';
const CNFT_TRANSFER =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAKDF8NEXtutZJGVXDVDJs/epFozMsVUg0imeV+RH3Rc05f8ZH9R4SpS9j9dC+W2qTIJUlCIk7UdOqe1Q3EjsfcaWmYi4DreTUoabIkdF9Z3b+KJljKE9xogSEmNRyuB8GlpfxFNRf9WU9QmoVU/6D7T6ln+JIDY4CaZIrH/ggktlN8gliLZxrNb9ddLnB7Od3Jy5VJ42xHg0DpoRo12/jmpbYLvA/Au0fKL3TEES6UqxPPo8Y05dwX6ssDzRojzX54fAkqE+6VxBy6CKZ/WsZ+jffh2hFiXh1kE3+PTyODA38UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACtMii2dvfTzUKEpUQ/F/GWKzbkkbMKQLJAWEnll7pftbTBGVGVfG+PZCxK9hzWskZA/sbcf8YH7oIGqZ6SQQ0wId25o1aBXD+sECa23sXfMSSvuttIXJulo+M5igS3uoXlh2mzKhvq8eonN1pECVoNH7Zkzi3TWOf8v7eMJqGTRIf3aJhFeELtY7Efl2Epk7XrTGw7maDiWLw8A51NTRptAQINAwAABAEFBgcHCAkKC3SjNMjnjANFuhBzmuYWMMVjysbazGmRxUZC1eL+mk6co30Sw9SgjlkOpf6+9zy8VAqLw0rz+6NU2eV3Ip9H55pOEf8j8X/V+OrF0kYBhvcjPJJ+fbLcxwPA5QC2U8qCJzt7+tgEXYWkcAAAAAAAAAAAAAAAAAA=';

/** The CNFT_BURN fixture with its Bubblegum instruction repeated on another leaf. */
function withSecondLeaf(transactionBase64: string): string {
  const transaction = getTransactionDecoder().decode(
    new Uint8Array(Buffer.from(transactionBase64, 'base64'))
  );
  const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  if (!('instructions' in message)) throw new Error('fixture is not a v0 message');
  const accounts = message.staticAccounts.map(String);
  const bubblegum = message.instructions.find(
    (instruction) => accounts[instruction.programAddressIndex] === BUBBLEGUM_PROGRAM
  );
  if (!bubblegum?.data) throw new Error('fixture has no Bubblegum instruction');
  const data = new Uint8Array(bubblegum.data);
  data[data.length - 12] ^= 1; // the nonce: a different leaf, a different NFT
  const messageBytes = getCompiledTransactionMessageEncoder().encode({
    ...message,
    instructions: [...message.instructions, { ...bubblegum, data }],
  });
  return Buffer.from(
    getTransactionEncoder().encode({
      ...transaction,
      messageBytes: messageBytes as typeof transaction.messageBytes,
    })
  ).toString('base64');
}

/** A Bubblegum `transferV2` of a leaf-schema v2 cNFT, as the backend builds it. */
const CNFT_V2_ASSET = '6exX2gnKzMjPxCWjQh3J5vcqeVqnW5cY5SfyCDBYLFWs';
const CNFT_TRANSFER_V2 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAKDV8NEXtutZJGVXDVDJs/epFozMsVUg0imeV+RH3Rc05fzZ3A0bTExyo70vF78tTOEp9QUs3pbxFbZ16kUEyWQFb/laJGvE47J0VMXF8bsWVqW9OvOFwdSOaNlW0QnhAJ+JiLgOt5NShpsiR0X1ndv4omWMoT3GiBISY1HK4HwaWlgliLZxrNb9ddLnB7Od3Jy5VJ42xHg0DpoRo12/jmpbYLeVmKD68osPvSJWMjM0FL0DqrJA9wMtHeR1egrF3GBgtuAVMjSSXEB/GBVnb80yz1pI9uixaZN1Yku81eFHLLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACHFoJLL8sGsZ6FfcDtKma8tqf4cBeMfOQPRoMdRsYNea0yKLZ299PNQoSlRD8X8ZYrNuSRswpAskBYSeWXul+1tMEZUZV8b49kLEr2HNayRkD+xtx/xgfuggapnpJBDTAh3bmjVoFcP6wQJrbexd8xJK+620hcm6Wj4zmKBLe6heWHabMqG+rx6ic3WkQJWg0ftmTOLdNY5/y/t4wmoZNEk5/6saGN/oHPqJ2lfuIFLRE9jjjP2+4z3d65gQ3S8lIBAxABAAAAAAQCAwUGBwgJCgsMlwF3KAbr6t34MV4YC9Be6AAt1/qwYoCFmF1pjGsDdj9Zrjhx3/ctH9hSbInOis5g7i5y5RJYN2kP+r9EygSdP/Pf0VeqlnbfbmjF0kYBhvcjPJJ+fbLcxwPA5QC2U8qCJzt7+tgEXYWkcAHF0kYBhvcjPJJ+fbLcxwPA5QC2U8qCJzt7+tgEXYWkcAEAAQAAAAAAAAABAAAAAA==';

describe('nftAction', () => {
  const expectation = (nftAction: { asset: string; destination?: string }) => ({
    feePayer: CNFT_OWNER,
    allowedPrograms: NFT_TRANSACTION_PROGRAMS,
    allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
    nftAction,
  });
  const check = async (
    transactionBase64: string,
    nftAction: { asset: string; destination?: string }
  ) =>
    assertSolanaTransactionMatches(
      transactionBase64,
      expectation(nftAction),
      await bubblegumAssets(transactionBase64)
    );

  // A compressed NFT is not an account: its id never appears in the message,
  // so it is derived from the instruction — the tree and the leaf's nonce.
  it('accepts a compressed burn of the NFT on screen', async () => {
    await expect(check(CNFT_BURN, { asset: CNFT_ASSET })).resolves.toBeUndefined();
  });

  it('accepts a compressed transfer of that NFT to the typed destination', async () => {
    await expect(
      check(CNFT_TRANSFER, { asset: CNFT_ASSET, destination: CNFT_RECIPIENT })
    ).resolves.toBeUndefined();
  });

  // Naming the NFT on screen is not enough: a second instruction could burn
  // another one of the user's, and the first check only asked for presence.
  it('refuses a burn that also burns a second NFT', async () => {
    await expect(check(withSecondLeaf(CNFT_BURN), { asset: CNFT_ASSET })).rejects.toThrow(
      /other than/
    );
  });

  it('refuses a burn of an NFT other than the one on screen', async () => {
    await expect(check(CNFT_BURN, { asset: NAMED })).rejects.toThrow(
      SolanaTransactionMismatchError
    );
  });

  // The destination must be the new owner itself, not merely an address
  // mentioned somewhere in the message.
  it('refuses a transfer whose new owner is not the typed destination', async () => {
    await expect(
      check(CNFT_TRANSFER, { asset: CNFT_ASSET, destination: CNFT_OWNER })
    ).rejects.toThrow(/somewhere other than/);
  });

  it('reads the new owner from its own slot in a transferV2', async () => {
    await expect(
      check(CNFT_TRANSFER_V2, { asset: CNFT_V2_ASSET, destination: CNFT_RECIPIENT })
    ).resolves.toBeUndefined();
    await expect(
      check(CNFT_TRANSFER_V2, { asset: CNFT_V2_ASSET, destination: CNFT_OWNER })
    ).rejects.toThrow(/somewhere other than/);
  });

  it('refuses a transfer where the flow asked for a burn', async () => {
    await expect(check(CNFT_TRANSFER, { asset: CNFT_ASSET })).rejects.toThrow(/does not use/);
  });

  it('refuses a transaction that does not touch the NFT at all', async () => {
    await expect(check(NO_LOOKUPS, { asset: CNFT_ASSET })).rejects.toThrow(
      /pays from|does not act on/
    );
  });
});

/**
 * A v0 message built on the NO_LOOKUPS fixture's frame with our own static
 * accounts and instructions, so a rule can be checked against exactly the
 * instruction shapes a swap carries.
 */
function message(
  accounts: readonly string[],
  instructions: readonly { program: string; accounts: number[]; data: number[] }[]
): string {
  const transaction = getTransactionDecoder().decode(
    new Uint8Array(Buffer.from(NO_LOOKUPS, 'base64'))
  );
  const decoded = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  if (!('instructions' in decoded)) throw new Error('fixture is not a v0 message');
  const messageBytes = getCompiledTransactionMessageEncoder().encode({
    ...decoded,
    staticAccounts: accounts as unknown as typeof decoded.staticAccounts,
    instructions: instructions.map((instruction) => ({
      programAddressIndex: accounts.indexOf(instruction.program),
      accountIndices: instruction.accounts,
      data: new Uint8Array(instruction.data),
    })),
  });
  return Buffer.from(
    getTransactionEncoder().encode({
      ...transaction,
      messageBytes: messageBytes as typeof transaction.messageBytes,
    })
  ).toString('base64');
}

describe("account binds — an instruction may only reach the wallet's own accounts", () => {
  const WSOL_ATA = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  const ATTACKER = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const MINT = 'So11111111111111111111111111111111111111112';
  // 0 owner, 1 wsol ata, 2 attacker, 3 mint, 4 system, 5 token, 6 ata program
  const ACCOUNTS = [
    OWNER,
    WSOL_ATA,
    ATTACKER,
    MINT,
    SYSTEM_PROGRAM,
    TOKEN_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
  ];
  const createIdempotent = {
    program: ASSOCIATED_TOKEN_PROGRAM,
    accounts: [0, 1, 0, 3, 4, 5],
    data: [1],
  };
  const transferTo = (index: number) => ({
    program: SYSTEM_PROGRAM,
    accounts: [0, index],
    data: [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  });
  const closeTo = (index: number) => ({
    program: TOKEN_PROGRAM,
    accounts: [1, index, 0],
    data: [9],
  });
  const rules = {
    [SYSTEM_PROGRAM]: {
      width: 4 as const,
      codes: [2],
      binds: [{ code: 2, index: 1, mustBe: 'ownAtaCreatedHere' as const }],
    },
    [TOKEN_PROGRAM]: {
      width: 1 as const,
      codes: [9, 17],
      binds: [{ code: 9, index: 1, mustBe: 'feePayer' as const }],
    },
  };
  const expectation = {
    feePayer: OWNER,
    allowedPrograms: [SYSTEM_PROGRAM, TOKEN_PROGRAM, ASSOCIATED_TOKEN_PROGRAM],
    allowedInstructions: rules,
  };

  it('accepts wrapping SOL into an account this message creates for the wallet, and closing it back', () => {
    expect(() =>
      assertSolanaTransactionMatches(
        message(ACCOUNTS, [createIdempotent, transferTo(1), closeTo(0)]),
        expectation
      )
    ).not.toThrow();
  });

  it('refuses a SOL transfer to any other account, even one created here for someone else', () => {
    expect(() =>
      assertSolanaTransactionMatches(
        message(ACCOUNTS, [createIdempotent, transferTo(2)]),
        expectation
      )
    ).toThrow(/not the wallet's own/);
    const forAttacker = { ...createIdempotent, accounts: [0, 1, 2, 3, 4, 5] };
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [forAttacker, transferTo(1)]), expectation)
    ).toThrow(/not the wallet's own/);
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [transferTo(1)]), expectation)
    ).toThrow(/not the wallet's own/);
  });

  it('refuses closing an account to anyone but the wallet, and any Token instruction outside the list', () => {
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [closeTo(2)]), expectation)
    ).toThrow(/not the wallet's own/);
    const approve = {
      program: TOKEN_PROGRAM,
      accounts: [1, 2, 0],
      data: [4, 1, 0, 0, 0, 0, 0, 0, 0],
    };
    expect(() => assertSolanaTransactionMatches(message(ACCOUNTS, [approve]), expectation)).toThrow(
      /instruction 4 on/
    );
    const setAuthority = { program: TOKEN_PROGRAM, accounts: [1, 0], data: [6, 2, 1] };
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [setAuthority]), expectation)
    ).toThrow(/instruction 6 on/);
  });
});

/**
 * The backend's NFT and lookup-table builders emit no top-level System
 * instruction; the table program funds its own account by cross-program call.
 * Each System instruction is one the wallet can sign alone that moves or
 * re-owns its SOL: CreateAccountWithSeed with the wallet as base funds an
 * account another program controls, Assign hands the wallet itself away.
 */
describe('NFT and lookup-table steps carry no System instruction', () => {
  const ATTACKER_PROGRAM = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const SEEDED = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  // 0 owner, 1 seeded account, 2 attacker program, 3 system, 4 lookup-table program
  const ACCOUNTS = [OWNER, SEEDED, ATTACKER_PROGRAM, SYSTEM_PROGRAM, ADDRESS_LOOKUP_TABLE_PROGRAM];
  const u32 = (value: number) => [value, 0, 0, 0];
  const steps = {
    nft: {
      allowedPrograms: NFT_TRANSACTION_PROGRAMS,
      allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
    },
    'lookup-table': {
      allowedPrograms: LOOKUP_TABLE_STEP_PROGRAMS,
      allowedInstructions: LOOKUP_TABLE_STEP_INSTRUCTIONS,
    },
  };

  it.each(Object.keys(steps))('refuses every System instruction in an %s step', (step) => {
    const rules = steps[step as keyof typeof steps];
    const cases: [number, number[]][] = [
      [0, [0, 1]], // CreateAccount
      [1, [0]], // Assign the wallet
      [3, [0, 1, 0]], // CreateAccountWithSeed, base = wallet
      [8, [0]], // Allocate
      [9, [1, 0]], // AllocateWithSeed
      [10, [1, 0]], // AssignWithSeed
    ];
    for (const [code, accounts] of cases) {
      const system = {
        program: SYSTEM_PROGRAM,
        accounts,
        data: [...u32(code), ...new Array(40).fill(0)],
      };
      expect(() =>
        assertSolanaTransactionMatches(message(ACCOUNTS, [system]), { feePayer: OWNER, ...rules })
      ).toThrow(/invokes 11111111111111111111111111111111/);
    }
  });

  it('lets a lookup-table step create and extend a table, and nothing else on that program', () => {
    const check = (code: number) => () =>
      assertSolanaTransactionMatches(
        message(ACCOUNTS, [
          {
            program: ADDRESS_LOOKUP_TABLE_PROGRAM,
            accounts: [1, 0, 0],
            data: [...u32(code), ...new Array(9).fill(0)],
          },
        ]),
        { feePayer: OWNER, ...steps['lookup-table'] }
      );
    expect(check(0)).not.toThrow(); // CreateLookupTable
    expect(check(2)).not.toThrow(); // ExtendLookupTable
    expect(check(3)).toThrow(/instruction 3 on/); // DeactivateLookupTable
    expect(check(4)).toThrow(/instruction 4 on/); // CloseLookupTable
  });
});

/**
 * Compute Budget instructions set what the wallet pays on top of the network
 * fee; the screen never shows it. A flow may set a unit limit and a unit
 * price, and the two together are capped.
 */
describe('compute budget', () => {
  // 0 owner, 1 compute budget program
  const ACCOUNTS = [OWNER, COMPUTE_BUDGET_PROGRAM];
  const le = (value: bigint, bytes: number) =>
    Array.from({ length: bytes }, (_, i) => Number((value >> BigInt(8 * i)) & 0xffn));
  const limit = (units: number) => ({
    program: COMPUTE_BUDGET_PROGRAM,
    accounts: [],
    data: [2, ...le(BigInt(units), 4)],
  });
  const price = (microLamports: bigint) => ({
    program: COMPUTE_BUDGET_PROGRAM,
    accounts: [],
    data: [3, ...le(microLamports, 8)],
  });
  const flows = {
    nft: {
      allowedPrograms: NFT_TRANSACTION_PROGRAMS,
      allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
    },
    'lookup-table': {
      allowedPrograms: LOOKUP_TABLE_STEP_PROGRAMS,
      allowedInstructions: LOOKUP_TABLE_STEP_INSTRUCTIONS,
    },
  };
  const check = (flow: keyof typeof flows, instructions: Parameters<typeof message>[1]) => () =>
    assertSolanaTransactionMatches(message(ACCOUNTS, instructions), {
      feePayer: OWNER,
      ...flows[flow],
    });

  it.each(Object.keys(flows) as (keyof typeof flows)[])(
    'lets an %s step set a unit limit and price, and nothing else',
    (flow) => {
      expect(check(flow, [limit(400_000), price(20_000n)])).not.toThrow();
      const heapFrame = {
        program: COMPUTE_BUDGET_PROGRAM,
        accounts: [],
        data: [1, ...le(256n * 1024n, 4)],
      };
      expect(check(flow, [heapFrame])).toThrow(/instruction 1 on/);
      const dataSize = {
        program: COMPUTE_BUDGET_PROGRAM,
        accounts: [],
        data: [4, ...le(1024n, 4)],
      };
      expect(check(flow, [dataSize])).toThrow(/instruction 4 on/);
    }
  );

  it('refuses a priority fee above the cap in any flow', () => {
    const anyFlow = (instructions: Parameters<typeof message>[1]) => () =>
      assertSolanaTransactionMatches(message(ACCOUNTS, instructions), {
        feePayer: OWNER,
        allowedPrograms: [COMPUTE_BUDGET_PROGRAM],
      });
    // 1.4M units at 10 lamports each: 0.014 SOL.
    expect(anyFlow([limit(1_400_000), price(10_000_000n)])).toThrow(/priority fee/);
    // A price with no limit is charged at the most units a transaction can use.
    expect(anyFlow([price(8_000_000n)])).toThrow(/priority fee/);
    expect(anyFlow([limit(200_000), price(8_000_000n)])).not.toThrow();
  });
});

describe('NFT steps — account creation and Token Metadata amounts', () => {
  const ASSET = 'CgHasf5U6aaT6oYPrKWHfKByBGeQpiPmac2YKWpE2Mek';
  const DESTINATION = '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3';
  const TOKEN_ACCOUNT = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  // 0 owner, 1 token account, 2 destination, 3 asset, 4 token metadata, 5 ATA program, 6 system, 7 token
  const ACCOUNTS = [
    OWNER,
    TOKEN_ACCOUNT,
    DESTINATION,
    ASSET,
    TOKEN_METADATA_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    SYSTEM_PROGRAM,
    TOKEN_PROGRAM,
  ];
  const le = (value: bigint) =>
    Array.from({ length: 8 }, (_, i) => Number((value >> BigInt(8 * i)) & 0xffn));
  // transferV1 / burnV1 accounts: token, tokenOwner, destinationToken, destinationOwner, mint, …
  const metadata = (code: number, amount: bigint) => ({
    program: TOKEN_METADATA_PROGRAM,
    accounts: [1, 0, 1, 2, 3],
    data: [code, 0, ...le(amount), 0],
  });
  const nft = (nftAction: { asset: string; destination?: string }) => ({
    feePayer: OWNER,
    allowedPrograms: NFT_TRANSACTION_PROGRAMS,
    allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
    nftAction,
  });

  it('holds a Token Metadata transfer or burn to one token', () => {
    const transfer = { asset: ASSET, destination: DESTINATION };
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [metadata(49, 1n)]), nft(transfer))
    ).not.toThrow();
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [metadata(49, 2n)]), nft(transfer))
    ).toThrow(/other than one/);
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [metadata(41, 1n)]), nft({ asset: ASSET }))
    ).not.toThrow();
    expect(() =>
      assertSolanaTransactionMatches(message(ACCOUNTS, [metadata(41, 5n)]), nft({ asset: ASSET }))
    ).toThrow(/other than one/);
  });

  // Token Metadata creates the destination's account itself, by cross-program
  // call; no backend NFT builder creates one at top level.
  it('refuses an associated token account created at top level', () => {
    const create = {
      program: ASSOCIATED_TOKEN_PROGRAM,
      accounts: [0, 1, 2, 3, 6, 7],
      data: [1],
    };
    expect(() =>
      assertSolanaTransactionMatches(
        message(ACCOUNTS, [create, metadata(49, 1n)]),
        nft({ asset: ASSET, destination: DESTINATION })
      )
    ).toThrow(/invokes ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL/);
  });
});
