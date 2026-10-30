/**
 * What a Dagon build may carry, beyond the program vocabulary in the
 * manifest (spec 027 §2: the list is a vocabulary, not a sentence). Read off
 * the backend's builders (salmon-wallet-backend,
 * `src/services/solana/powerups/adapters/dagon/{index,instructions}.js`):
 * each action is one pc-token or pc-swap instruction (setup may prepend
 * Encrypt's `create_deposit`), behind the compute budget the build service
 * prepends. System Program and SPL Token are on the manifest only because
 * those programs call them; a top-level System or Token instruction (a SOL
 * transfer, an Approve, a SetAuthority) is refused before the user signs.
 */
import type { DeclaredTransactionEffects, ProgramInstructionRule } from '../../core/verify';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_INSTRUCTIONS,
  COMPUTE_BUDGET_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import { pcAccountAddress } from './chain';
import type { DagonConfig } from './config';
import {
  ENCRYPT_PROGRAM,
  PC_SWAP_PROGRAM,
  PC_TOKEN_PROGRAM,
  type DagonAction,
  type Side,
} from './constants';
import { dagonManifest } from './manifest';

const NONE: ProgramInstructionRule = { width: 1, codes: [] };

/** One instruction code whose listed account slots must be the wallet. */
const only = (code: number, payerSlots: readonly number[]): ProgramInstructionRule => ({
  width: 1,
  codes: [code],
  binds: payerSlots.map((index) => ({ code, index, mustBe: 'feePayer' as const })),
});

/**
 * The pc-token code per action and where its builder puts the payer: every
 * pc-token instruction but UnwrapComplete ends with Encrypt's nine-account
 * tail, payer sixth in it (`encryptTail`); UnwrapComplete names the owner
 * twice, as signer and as rent destination.
 */
const PC_TOKEN_RULES: Partial<Record<DagonAction, ProgramInstructionRule>> = {
  setup: only(1, [10]), // initializeAccount: 4 accounts + tail
  wrap: only(30, [12]), // 6 + tail
  reveal: only(40, [10]), // viewBalance: 4 + tail
  send: only(3, [11]), // transfer: 5 + tail
  unwrapBurn: only(31, [12]), // 6 + tail
  unwrapDecrypt: only(32, [9]), // 3 + tail
  unwrapComplete: only(33, [6, 7]),
};

export function dagonInstructions(
  action: DagonAction
): Readonly<Record<string, ProgramInstructionRule>> {
  return {
    [COMPUTE_BUDGET_PROGRAM]: COMPUTE_BUDGET_INSTRUCTIONS,
    [SYSTEM_PROGRAM]: { width: 4, codes: [] },
    [TOKEN_PROGRAM]: NONE,
    [ASSOCIATED_TOKEN_PROGRAM]: NONE,
    // createDeposit (14), only before a first setup: payer at 2, 3 and 4.
    [ENCRYPT_PROGRAM]: action === 'setup' ? only(14, [2, 3, 4]) : NONE,
    [PC_TOKEN_PROGRAM]: PC_TOKEN_RULES[action] ?? NONE,
    // swap (1): payer at 23.
    [PC_SWAP_PROGRAM]: action === 'swap' ? only(1, [23]) : NONE,
  };
}

export interface DagonExpectationInput {
  config: DagonConfig;
  wallet: string;
  /** The sides the action acts on, input first for a swap. */
  sides: readonly Side[];
  /** A send's recipient, or the owner a setup opens an account for. */
  counterparty?: string;
}

/**
 * The accounts each action must name, so a build cannot act on another
 * token or another wallet's account: the side's pc-account (derived from its
 * pc-mint), plus the vault accounts public tokens move through.
 */
async function requiredAccounts(
  action: DagonAction,
  { config, wallet, sides, counterparty }: DagonExpectationInput
): Promise<string[]> {
  const [first, second] = sides.map((side) => config.sides[side]);
  if (!first) return [];
  const own = (pcMint: string) => pcAccountAddress(pcMint, wallet);
  switch (action) {
    case 'setup':
      return [first.pcMint, await pcAccountAddress(first.pcMint, counterparty ?? wallet)];
    case 'wrap':
      return [await own(first.pcMint), first.vault, first.vaultAta];
    case 'reveal':
      return [await own(first.pcMint)];
    case 'send':
      return counterparty
        ? [await own(first.pcMint), await pcAccountAddress(first.pcMint, counterparty)]
        : [await own(first.pcMint)];
    case 'swap':
      return second ? [await own(first.pcMint), await own(second.pcMint)] : [];
    case 'unwrapBurn':
      return [await own(first.pcMint), first.vault];
    case 'unwrapDecrypt':
      // The backend finds the side from the receipt; nothing side-specific is named.
      return [];
    case 'unwrapComplete':
      return [first.pcMint, first.vault, first.vaultAta];
  }
}

export async function dagonExpectation(
  action: DagonAction,
  input: DagonExpectationInput
): Promise<DeclaredTransactionEffects> {
  return {
    allowedPrograms: dagonManifest.programs,
    allowedInstructions: dagonInstructions(action),
    requiredAccounts: await requiredAccounts(action, input),
  };
}
