/**
 * What the device reads from devnet itself, through the same read client
 * Payments uses: the pc-accounts, their balance ciphertexts, the public
 * balances, and whether Encrypt finished an operation (GUIDE §2, §8). One
 * batched `getMultipleAccounts` per poll (O1); no subscription.
 */
import {
  address,
  getAddressDecoder,
  getAddressEncoder,
  getBase64Encoder,
  getProgramDerivedAddress,
} from '@solana/kit';
import type { SolanaRpc } from '../../blockchain/solana/networks';
import type { DagonConfig } from './config';
import { PC_TOKEN_PROGRAM, SIDES, type Side } from './constants';

export type DagonRpc = Pick<
  SolanaRpc,
  'getMultipleAccounts' | 'getTokenAccountsByOwner' | 'getBalance'
>;

const DIGEST = [2, 34] as const;
const STATUS_BYTE = 99;
const BALANCE_CT = [64, 96] as const;

export async function pcAccountAddress(pcMint: string, owner: string): Promise<string> {
  const encoder = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(PC_TOKEN_PROGRAM),
    seeds: ['pc_account', encoder.encode(address(pcMint)), encoder.encode(address(owner))],
  });
  return pda;
}

export const balanceCtOf = (pcAccount: Uint8Array): string =>
  getAddressDecoder().decode(pcAccount.subarray(...BALANCE_CT));

export const digestOf = (ciphertext: Uint8Array): string =>
  Array.from(ciphertext.subarray(...DIGEST), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const isZeroDigest = (ciphertext: Uint8Array): boolean =>
  ciphertext.subarray(...DIGEST).every((byte) => byte === 0);

/**
 * Encrypt finished writing a ciphertext: its digest moved off the snapshot
 * taken before sending AND its status byte reads verified. Either alone is
 * not enough: the digest moves before the executor commits (FR-027).
 */
export function isSettled(snapshot: string | null, ciphertext: Uint8Array | null): boolean {
  if (!ciphertext || ciphertext[STATUS_BYTE] !== 1) return false;
  return snapshot === null || digestOf(ciphertext) !== snapshot;
}

/** Raw account data, in order, `null` where none exists; one RPC call. */
export async function readAccounts(
  rpc: Pick<DagonRpc, 'getMultipleAccounts'>,
  addresses: readonly string[]
): Promise<(Uint8Array | null)[]> {
  if (addresses.length === 0) return [];
  const { value } = await rpc
    .getMultipleAccounts(
      addresses.map((each) => address(each)),
      {
        encoding: 'base64',
        commitment: 'confirmed',
      }
    )
    .send();
  const encoder = getBase64Encoder();
  return value.map((info) => (info ? new Uint8Array(encoder.encode(info.data[0])) : null));
}

export interface SidePosition {
  activated: boolean;
  balanceCt: string | null;
  digest: string | null;
  /** Encrypt never wrote this balance: a swap from it would compute on nothing (FR-030). */
  zeroDigest: boolean;
  /** The wallet's public SPL balance of this side, in base units. */
  publicBalance: bigint;
}

export interface Positions {
  /** Both sides set up. */
  activated: boolean;
  sides: Record<Side, SidePosition>;
  /** Devnet SOL, in lamports. */
  sol: bigint;
}

async function publicBalance(rpc: DagonRpc, owner: string, mint: string): Promise<bigint> {
  const { value } = await rpc
    .getTokenAccountsByOwner(
      address(owner),
      { mint: address(mint) },
      { encoding: 'jsonParsed', commitment: 'confirmed' }
    )
    .send();
  return value.reduce(
    (sum, { account }) =>
      sum +
      BigInt(
        (account.data as { parsed: { info: { tokenAmount: { amount: string } } } }).parsed.info
          .tokenAmount.amount
      ),
    0n
  );
}

export async function readPositions(
  rpc: DagonRpc,
  config: DagonConfig,
  owner: string
): Promise<Positions> {
  const pcAccounts = await readAccounts(
    rpc,
    await Promise.all(SIDES.map((side) => pcAccountAddress(config.sides[side].pcMint, owner)))
  );
  const balanceCts = pcAccounts.map((data) => (data ? balanceCtOf(data) : null));
  const known = balanceCts.filter((each): each is string => each !== null);
  const [ciphertexts, publics, sol] = await Promise.all([
    readAccounts(rpc, known),
    Promise.all(SIDES.map((side) => publicBalance(rpc, owner, config.sides[side].splMint))),
    rpc.getBalance(address(owner), { commitment: 'confirmed' }).send(),
  ]);
  const sides = {} as Record<Side, SidePosition>;
  SIDES.forEach((side, index) => {
    const balanceCt = balanceCts[index];
    const data = balanceCt ? ciphertexts[known.indexOf(balanceCt)] : null;
    sides[side] = {
      activated: balanceCt !== null,
      balanceCt,
      digest: data ? digestOf(data) : null,
      zeroDigest: data ? isZeroDigest(data) : true,
      publicBalance: publics[index],
    };
  });
  return { activated: SIDES.every((side) => sides[side].activated), sides, sol: sol.value };
}
