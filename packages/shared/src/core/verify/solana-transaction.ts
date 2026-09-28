/**
 * core/verify — what a backend-built transaction claims, checked before it is
 * signed.
 *
 * The signing boundary says Salmon's backend never holds a signed transaction:
 * it builds, the device signs, the device broadcasts. That keeps the backend
 * from moving a user's assets. It does not keep a wrong or compromised backend
 * from returning a transaction that does something other than what the screen
 * says, and having the user sign it themselves — because the confirmation
 * screen is drawn from the response's own fields, not from the bytes.
 *
 * This module closes that gap. The caller states what the transaction is for,
 * and the transaction is refused unless it agrees.
 *
 * What is checked, and why only these three:
 *
 * - **The fee payer** is the signing wallet. A transaction that pays from
 *   another account is not this user's to sign.
 * - **Every invoked program** is one the flow declared. Solana requires a
 *   program to be a static account, never one resolved from a lookup table, so
 *   this check cannot be dodged by hiding the program in a table.
 * - **Each instruction is one the flow uses.** The program allowlist is a
 *   vocabulary, not a sentence: SPL Token is on it so a burn can close its
 *   account, and that same entry would admit an `Approve` that hands a
 *   delegate every token the wallet holds. Flows that name their instruction
 *   codes are held to them.
 * - **Named accounts are present**, when the message carries no table lookups.
 *   With lookups the static list is incomplete, and an account missing from it
 *   proves nothing, so the check is skipped rather than made to lie.
 */
import {
  address,
  getAddressEncoder,
  getCompiledTransactionMessageDecoder,
  getProgramDerivedAddress,
  getTransactionDecoder,
} from '@solana/kit';
import type { ReadonlyUint8Array } from '@solana/kit';

import {
  BUBBLEGUM_PROGRAM,
  NFT_ACTION_LAYOUTS,
  TOKEN_2022_PROGRAM,
  TOKEN_METADATA_PROGRAM,
  TOKEN_PROGRAM,
} from './solana-programs';

/** What a flow declares about the transaction it asked the backend to build. */
export interface SolanaTransactionExpectation {
  /** The address that must pay the fee: the signing wallet's own. */
  feePayer: string;
  /** The programs this transaction may invoke. Anything else is refused. */
  allowedPrograms: readonly string[];
  /**
   * Which instructions of a program the flow uses, by program address.
   *
   * A program left out of this map is bound by `allowedPrograms` alone. One
   * listed here is bound to the codes given: the leading `width` bytes of the
   * instruction data are read as the little-endian discriminator every Solana
   * program of this shape puts there, and anything else is refused.
   */
  allowedInstructions?: Readonly<Record<string, ProgramInstructionRule>>;
  /**
   * Accounts the transaction must name — a mint, a destination. Checked only
   * when the message resolves no addresses through a lookup table.
   */
  requiredAccounts?: readonly string[];
  /**
   * An NFT flow's work step: every asset-touching instruction must be a burn
   * (no `destination`) or a transfer to `destination`, of `asset` and nothing
   * else. See `NFT_ACTION_LAYOUTS`.
   */
  nftAction?: NftActionExpectation;
}

/** The one NFT a burn or transfer may act on, and where a transfer sends it. */
export interface NftActionExpectation {
  asset: string;
  destination?: string;
}

/**
 * What a flow declares about its own transaction.
 *
 * The fee payer is not here: core fills it from the key that is about to sign,
 * because a flow saying who pays would be a flow saying whose key this is.
 */
export type DeclaredTransactionEffects = Omit<SolanaTransactionExpectation, 'feePayer'>;

/**
 * A flow that has not declared what its transaction may do.
 *
 * Passing this is a decision, not an oversight: it says the caller knows the
 * transaction is unverified. Grep for it to find what is still trusted blindly.
 */
export const UNVERIFIED = 'unverified' as const;
export type Unverified = typeof UNVERIFIED;

/** A compiled message, whichever transaction version it carries. */
type CompiledMessage = ReturnType<
  ReturnType<typeof getCompiledTransactionMessageDecoder>['decode']
>;

/** The instruction codes one program may carry, and how wide its code is. */
export interface ProgramInstructionRule {
  /** Discriminator width in bytes: 1 for SPL Token, 4 for the System program. */
  width: 1 | 4;
  /** The codes the flow uses. Anything else on this program is refused. */
  codes: readonly number[];
}

/** One instruction, reduced to what can be checked before signing. */
interface CompiledInstruction {
  programAddressIndex: number;
  accountIndices: readonly number[];
  data: ReadonlyUint8Array | undefined;
}

/**
 * The instructions the message carries: which static account each invokes, and
 * the data it carries.
 *
 * Legacy and v0 messages carry `instructions`; a v1 message splits the same
 * thing into `instructionHeaders` and `instructionPayloads`. A shape that is
 * neither is refused rather than waved through: a check that cannot read a
 * transaction has not approved it.
 */
function compiledInstructions(message: CompiledMessage): CompiledInstruction[] {
  if ('instructions' in message) {
    return message.instructions.map((instruction) => ({
      programAddressIndex: instruction.programAddressIndex,
      accountIndices: instruction.accountIndices ?? [],
      data: instruction.data,
    }));
  }
  if ('instructionHeaders' in message) {
    return message.instructionHeaders.map((header, index) => ({
      programAddressIndex: header.programAccountIndex,
      accountIndices: message.instructionPayloads[index]?.instructionAccountIndices ?? [],
      data: message.instructionPayloads[index]?.instructionData,
    }));
  }
  throw new SolanaTransactionMismatchError(
    'Transaction uses a message version this wallet cannot read before signing'
  );
}

/** The leading little-endian discriminator, or null when the data is too short. */
function discriminator(data: ReadonlyUint8Array | undefined, width: 1 | 4): number | null {
  if (!data || data.length < width) return null;
  let code = 0;
  for (let byte = width - 1; byte >= 0; byte -= 1) {
    code = code * 256 + (data[byte] as number);
  }
  return code;
}

/** Raised when the built transaction disagrees with what the flow declared. */
export class SolanaTransactionMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolanaTransactionMismatchError';
  }
}

function decodeMessage(transactionBase64: string): CompiledMessage {
  const decoded = getTransactionDecoder().decode(
    new Uint8Array(Buffer.from(transactionBase64, 'base64'))
  );
  return getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
}

/** Bubblegum's args end in `nonce: u64, index: u32`, in V1 and V2 alike. */
const BUBBLEGUM_NONCE_TAIL_BYTES = 12;

/**
 * The compressed NFT each Bubblegum instruction acts on, by instruction index.
 *
 * A compressed NFT is not an account, so its id never appears in the message:
 * Bubblegum derives it from the tree and the leaf's nonce. It is derived here
 * the same way, from the bytes, so a burn or transfer can be held to the asset
 * the screen showed without trusting the response to say which one it is.
 *
 * The tree is the instruction account whose config PDA is the instruction's
 * first account — Bubblegum refuses any other pairing on chain — so an unused
 * account listed alongside cannot stand in for it. An instruction whose
 * accounts are resolved through a lookup table derives nothing, and the
 * verifier then refuses it.
 */
export async function bubblegumAssets(transactionBase64: string): Promise<Map<number, string>> {
  const message = decodeMessage(transactionBase64);
  const accounts = message.staticAccounts.map(String);
  const program = address(BUBBLEGUM_PROGRAM);
  const encodeAddress = getAddressEncoder();
  const assets = new Map<number, string>();

  for (const [position, instruction] of compiledInstructions(message).entries()) {
    const { data, accountIndices } = instruction;
    if (accounts[instruction.programAddressIndex] !== BUBBLEGUM_PROGRAM) continue;
    if (!data || data.length < BUBBLEGUM_NONCE_TAIL_BYTES) continue;

    const treeConfig = accounts[accountIndices[0] ?? -1];
    if (!treeConfig) continue;
    const nonceStart = data.length - BUBBLEGUM_NONCE_TAIL_BYTES;
    const nonce = data.slice(nonceStart, nonceStart + 8);

    for (const index of accountIndices.slice(1)) {
      const candidate = accounts[index];
      if (!candidate) continue;
      const [config] = await getProgramDerivedAddress({
        programAddress: program,
        seeds: [encodeAddress.encode(address(candidate))],
      });
      if (config !== treeConfig) continue;

      const [assetId] = await getProgramDerivedAddress({
        programAddress: program,
        seeds: ['asset', encodeAddress.encode(address(candidate)), nonce],
      });
      assets.set(position, assetId);
      break;
    }
  }
  return assets;
}

function hex(data: ReadonlyUint8Array, length: number): string {
  return Array.from(data.slice(0, length), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Holds every asset-touching instruction to the one NFT the flow is for.
 *
 * Presence is not enough: a transaction that names the NFT on screen can burn
 * or move another one in a second instruction. So each Bubblegum and Token
 * Metadata instruction must be the flow's own verb on `asset`, a transfer must
 * hand it to `destination` in the new-owner slot itself, an SPL burn must burn
 * that mint, and a closed account's rent goes back to the payer.
 */
function assertNftAction(
  accounts: readonly string[],
  instructions: readonly CompiledInstruction[],
  action: NftActionExpectation,
  feePayer: string,
  bubblegum: ReadonlyMap<number, string>
): void {
  const { bubblegum: bg, tokenMetadata: tm, splToken: spl } = NFT_ACTION_LAYOUTS;
  const isTransfer = action.destination !== undefined;
  const refuse = (why: string): never => {
    throw new SolanaTransactionMismatchError(why);
  };
  // An account read through a lookup table is not visible here: undecidable,
  // so refused rather than assumed.
  const accountAt = (instruction: CompiledInstruction, slot: number): string =>
    accounts[instruction.accountIndices[slot] ?? -1] ??
    refuse('Transaction resolves an NFT account through a lookup table it cannot verify');
  let actsOnAsset = false;

  for (const [position, instruction] of instructions.entries()) {
    const program = accounts[instruction.programAddressIndex];
    const data = instruction.data ?? new Uint8Array();

    if (program === BUBBLEGUM_PROGRAM) {
      const code = hex(data, 8);
      const newOwnerIndex = bg.transferNewOwnerIndex[code];
      const isVerb = isTransfer ? newOwnerIndex !== undefined : bg.burn.includes(code);
      if (!isVerb) refuse(`Transaction carries a Bubblegum instruction this flow does not use`);
      if (bubblegum.get(position) !== action.asset) {
        refuse(`Transaction acts on a compressed NFT other than ${action.asset}`);
      }
      if (isTransfer && accountAt(instruction, newOwnerIndex as number) !== action.destination) {
        refuse(`Transaction sends the NFT somewhere other than ${action.destination}`);
      }
      actsOnAsset = true;
    } else if (program === TOKEN_METADATA_PROGRAM) {
      const verb = isTransfer ? tm.transferCode : tm.burnCode;
      if (data[0] !== verb || data[1] !== tm.variantV1) {
        refuse('Transaction carries a Token Metadata instruction this flow does not use');
      }
      if (accountAt(instruction, tm.mintIndex) !== action.asset) {
        refuse(`Transaction acts on an NFT other than ${action.asset}`);
      }
      if (
        isTransfer &&
        accountAt(instruction, tm.transferDestinationOwnerIndex) !== action.destination
      ) {
        refuse(`Transaction sends the NFT somewhere other than ${action.destination}`);
      }
      actsOnAsset = true;
    } else if (program === TOKEN_PROGRAM || program === TOKEN_2022_PROGRAM) {
      const code = data[0];
      if (code !== undefined && (spl.burnCodes as readonly number[]).includes(code)) {
        if (isTransfer) refuse('Transaction burns tokens in a transfer');
        if (accountAt(instruction, spl.burnMintIndex) !== action.asset) {
          refuse(`Transaction burns a token other than ${action.asset}`);
        }
        actsOnAsset = true;
      } else if (
        code === spl.closeCode &&
        accountAt(instruction, spl.closeDestinationIndex) !== feePayer
      ) {
        refuse("Transaction sends a closed account's rent to another wallet");
      }
    }
  }

  if (!actsOnAsset) refuse(`Transaction does not act on ${action.asset}`);
}

/**
 * Refuses a transaction that disagrees with what the flow declared.
 *
 * @param transactionBase64 - The unsigned transaction, base64 wire format.
 * @param expectation - What the flow says the transaction is for.
 * @param bubblegum - The compressed NFT each Bubblegum instruction acts on,
 *   derived from the bytes by `bubblegumAssets`. Needed for `nftAction`.
 * @throws SolanaTransactionMismatchError - On the first disagreement found.
 */
export function assertSolanaTransactionMatches(
  transactionBase64: string,
  expectation: SolanaTransactionExpectation,
  bubblegum: ReadonlyMap<number, string> = new Map()
): void {
  const message = decodeMessage(transactionBase64);
  const accounts = message.staticAccounts.map(String);

  const feePayer = accounts[0];
  if (feePayer !== expectation.feePayer) {
    throw new SolanaTransactionMismatchError(
      `Transaction pays from ${feePayer ?? 'no account'}, not from ${expectation.feePayer}`
    );
  }

  const allowed = new Set(expectation.allowedPrograms);
  const instructionRules = expectation.allowedInstructions ?? {};
  for (const instruction of compiledInstructions(message)) {
    const index = instruction.programAddressIndex;
    // A program is always a static account: Solana refuses to invoke one
    // resolved through an address table. An index past the static list is
    // therefore not a program this wallet can account for.
    const program = accounts[index];
    if (program === undefined) {
      throw new SolanaTransactionMismatchError(
        `Transaction invokes an account outside its static list (index ${index})`
      );
    }
    if (!allowed.has(program)) {
      throw new SolanaTransactionMismatchError(
        `Transaction invokes ${program}, which this flow does not use`
      );
    }

    const rule = instructionRules[program];
    if (!rule) continue;

    const code = discriminator(instruction.data, rule.width);
    if (code === null) {
      throw new SolanaTransactionMismatchError(
        `Transaction carries an instruction on ${program} too short to identify`
      );
    }
    if (!rule.codes.includes(code)) {
      throw new SolanaTransactionMismatchError(
        `Transaction carries instruction ${code} on ${program}, which this flow does not use`
      );
    }
  }

  if (expectation.nftAction) {
    assertNftAction(
      accounts,
      compiledInstructions(message),
      expectation.nftAction,
      expectation.feePayer,
      bubblegum
    );
  }

  const required = expectation.requiredAccounts ?? [];
  if (required.length === 0) {
    return;
  }

  // Address tables resolve accounts this decoder cannot see, so a required
  // account missing from the static list may be hiding in one. That makes the
  // requirement undecidable rather than satisfied — and it used to return as
  // if satisfied, which handed the response the choice of whether the check
  // ran at all: including any lookup entry switched it off, silently. Refuse
  // instead. A flow that needs both a lookup table and a named-account
  // requirement has to resolve the tables before asserting, which this
  // verifier deliberately does not do.
  const named = new Set(accounts);
  const missing = required.filter((account) => !named.has(account));
  if (missing.length === 0) {
    return;
  }

  const usesLookupTables =
    'addressTableLookups' in message && (message.addressTableLookups ?? []).length > 0;
  if (usesLookupTables) {
    throw new SolanaTransactionMismatchError(
      `Transaction does not name ${missing[0]} in its static accounts, and its address table ` +
        `lookups cannot be resolved here — the requirement cannot be verified`
    );
  }

  throw new SolanaTransactionMismatchError(`Transaction does not name ${missing[0]}`);
}
