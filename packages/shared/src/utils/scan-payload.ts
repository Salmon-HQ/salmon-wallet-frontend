/**
 * What a scanned or pasted payload is, for the active chain.
 *
 * Lives here rather than beside the mobile scanner because the extension's
 * paste field reads the same payloads. A Solana payload that carries more than
 * an address is read as a Solana Pay transfer request in full (spec 033); a
 * bare address on any chain classifies as it always did.
 */
import { isAddress } from '@solana/kit';
import { BitcoinAccount } from '../blockchain/bitcoin/BitcoinAccount';
import { EthereumAccount } from '../blockchain/ethereum/EthereumAccount';
import {
  isTransferRequestUri,
  parseTransferRequest,
  type TransferRequest,
  type TransferRequestParseReason,
} from '../blockchain/solana/transfer-request';
import type { BlockchainType } from '../types/blockchain';

const VALIDATORS: Record<BlockchainType, (address: string) => boolean> = {
  solana: (address) => isAddress(address),
  bitcoin: (address) => BitcoinAccount.isValidAddress(address),
  ethereum: (address) => EthereumAccount.isValidAddress(address),
};

const URI_SCHEMES: Record<string, BlockchainType> = {
  solana: 'solana',
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
};

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

export type ScanClassification =
  | { kind: 'valid'; address: string; amount?: string; request?: TransferRequest }
  | { kind: 'invalidRequest'; reason: TransferRequestParseReason }
  | { kind: 'wrongChain' }
  | { kind: 'notAddress' };

interface ParsedPayload {
  address: string;
  amount?: string;
  chain?: BlockchainType;
  unknownScheme?: boolean;
}

/** The non-Solana URI shapes: `<scheme>:<address>?amount=`. */
function parsePayload(raw: string): ParsedPayload {
  const trimmed = raw.trim();
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/.exec(trimmed);
  if (!match) {
    return { address: trimmed };
  }

  const chain = URI_SCHEMES[match[1].toLowerCase()];
  if (!chain) {
    return { address: trimmed, unknownScheme: true };
  }

  const [path, query = ''] = match[2].replace(/^\/\//, '').split('?');
  let amount: string | undefined;
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === 'amount' && AMOUNT_PATTERN.test(value)) {
      amount = value;
    }
  }

  return { address: decodeURIComponent(path), amount, chain };
}

function belongsToAnotherChain(address: string, activeChain: BlockchainType): boolean {
  return (Object.keys(VALIDATORS) as BlockchainType[]).some(
    (other) => other !== activeChain && VALIDATORS[other](address)
  );
}

/** A request that asks for nothing beyond the address is just an address. */
function carriesRequest(request: TransferRequest): boolean {
  return (
    request.amount !== undefined ||
    request.splToken !== undefined ||
    request.references.length > 0 ||
    request.label !== undefined ||
    request.message !== undefined ||
    request.memo !== undefined
  );
}

function classifySolanaPay(raw: string, activeChain: BlockchainType): ScanClassification {
  if (activeChain !== 'solana') return { kind: 'wrongChain' };
  const parsed = parseTransferRequest(raw);
  if (parsed.ok) {
    const { request } = parsed;
    return carriesRequest(request)
      ? { kind: 'valid', address: request.recipient, amount: request.amount, request }
      : { kind: 'valid', address: request.recipient, amount: undefined };
  }
  if (parsed.reason === 'recipient') {
    const recipient = raw
      .trim()
      .replace(/^solana:/i, '')
      .split('?')[0];
    return belongsToAnotherChain(recipient, activeChain)
      ? { kind: 'wrongChain' }
      : { kind: 'notAddress' };
  }
  return { kind: 'invalidRequest', reason: parsed.reason };
}

export function classifyScanPayload(raw: string, activeChain: BlockchainType): ScanClassification {
  const validator = VALIDATORS[activeChain];
  if (!validator) {
    return { kind: 'notAddress' };
  }

  if (isTransferRequestUri(raw)) {
    return classifySolanaPay(raw, activeChain);
  }

  const { address, amount, chain, unknownScheme } = parsePayload(raw);
  if (unknownScheme) {
    return { kind: 'notAddress' };
  }
  if (chain && chain !== activeChain) {
    return { kind: 'wrongChain' };
  }
  if (validator(address)) {
    return { kind: 'valid', address, amount };
  }

  return belongsToAnotherChain(address, activeChain)
    ? { kind: 'wrongChain' }
    : { kind: 'notAddress' };
}
