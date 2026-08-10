import { BitcoinAccount, SolanaAccount, ethereum } from '@salmon/shared';
import type { BlockchainType } from '@salmon/shared';

const VALIDATORS: Record<BlockchainType, (address: string) => boolean> = {
  solana: (address) => SolanaAccount.isValidAddress(address),
  bitcoin: (address) => BitcoinAccount.isValidAddress(address),
  ethereum: (address) => ethereum.EthereumAccount.isValidAddress(address),
};

const URI_SCHEMES: Record<string, BlockchainType> = {
  solana: 'solana',
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
};

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

export type ScanClassification =
  | { kind: 'valid'; address: string; amount?: string }
  | { kind: 'wrongChain' }
  | { kind: 'notAddress' };

interface ParsedPayload {
  address: string;
  amount?: string;
  chain?: BlockchainType;
  unknownScheme?: boolean;
}

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
  let hasSplToken = false;
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === 'amount' && AMOUNT_PATTERN.test(value)) {
      amount = value;
    }
    if (key === 'spl-token') {
      hasSplToken = true;
    }
  }

  return {
    address: decodeURIComponent(path),
    // An spl-token amount is denominated in that token, which may not be the
    // token being sent — prefilling it would risk a wrong-amount send.
    amount: hasSplToken ? undefined : amount,
    chain,
  };
}

export function classifyScanPayload(
  raw: string,
  activeChain: BlockchainType
): ScanClassification {
  const validator = VALIDATORS[activeChain];
  if (!validator) {
    return { kind: 'notAddress' };
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

  const belongsToOtherChain = (Object.keys(VALIDATORS) as BlockchainType[]).some(
    (other) => other !== activeChain && VALIDATORS[other](address)
  );
  return belongsToOtherChain ? { kind: 'wrongChain' } : { kind: 'notAddress' };
}
