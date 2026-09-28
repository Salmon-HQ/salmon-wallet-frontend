import { describe, expect, it } from 'vitest';

import {
  getTransactionDescription,
  transformMultichainTransaction,
  transformSolanaTransaction,
} from './transactions';

describe('transaction utils', () => {
  it('normalizes native Solana token data and keeps an unknown type unknown', () => {
    const tx = transformSolanaTransaction({
      id: 'sig-1',
      timestamp: 1,
      status: 'completed',
      type: 'unknown',
      inputs: [
        {
          amount: 2_500_000,
          decimals: 6,
          symbol: 'USDC',
          contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      ],
      outputs: [
        {
          amount: 1_000_000_000,
          contract: 'So11111111111111111111111111111111111111112',
        },
      ],
      description: 'Unknown',
      source: 'RAYDIUM',
      heliusType: 'UNKNOWN',
    } as any);

    expect(tx.type).toBe('unknown');
    expect(tx.outputs[0]).toMatchObject({
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      contract: 'So11111111111111111111111111111111111111112',
    });
  });

  it('keeps a memo transaction as its own type and carries the note through', () => {
    const tx = transformSolanaTransaction({
      id: 'sig-memo',
      timestamp: 1,
      status: 'completed',
      type: 'memo',
      inputs: [],
      outputs: [],
      source: 'MEMO_PROGRAM',
      memo: 'gm',
    } as any);
    expect(tx.type).toBe('memo');
    expect(tx.memo).toBe('gm');
    expect(getTransactionDescription('memo', [], [])).toEqual({
      key: 'transactions.description.memo',
    });
  });

  it('normalizes native multichain tokens and coerces fee amounts', () => {
    const tx = transformMultichainTransaction(
      {
        id: 'tx-1',
        timestamp: 1,
        status: 'completed',
        type: 'unknown',
        fee: {
          amount: '123',
          decimals: 8,
          symbol: 'BTC',
        },
        inputs: [
          {
            amount: '50000000',
            contract: '',
          },
        ],
        outputs: [],
      } as any,
      'bitcoin'
    );

    expect(tx.type).toBe('receive');
    expect(tx.inputs[0]).toMatchObject({
      symbol: 'BTC',
      name: 'Bitcoin',
      decimals: 8,
      contract: '',
    });
    expect(tx.fee).toEqual({
      amount: 123,
      decimals: 8,
      symbol: 'BTC',
    });
  });

  it('names send and receive descriptions with the parts to interpolate', () => {
    expect(
      getTransactionDescription(
        'send',
        [],
        [
          {
            amount: '1',
            decimals: 9,
            symbol: 'SOL',
            contract: 'mint',
            destination: 'ABCDEFGH12345678',
          },
        ]
      )
    ).toEqual({
      key: 'transactions.description.sendTo',
      values: { address: expect.any(String) },
    });

    expect(
      getTransactionDescription(
        'receive',
        [{ amount: '1', decimals: 9, symbol: 'SOL', contract: 'mint', source: 'ABCDEFGH12345678' }],
        []
      )
    ).toEqual({
      key: 'transactions.description.receiveFrom',
      values: { address: expect.any(String) },
    });
  });

  it('falls back to transaction type labels when description is missing or unknown', () => {
    expect(getTransactionDescription('mint', [], [], undefined, 'Unknown instruction')).toEqual({
      key: 'transactions.description.mint',
    });
    expect(getTransactionDescription('interaction', [], [])).toEqual({
      key: 'transactions.description.interaction',
    });
  });

  it('passes the indexer description through as its own text', () => {
    // Not a key: `t()` returns an unknown key unchanged, which is what keeps
    // backend wording intact without a second branch at the call site.
    expect(getTransactionDescription('interaction', [], [], undefined, 'Staked 1 SOL')).toEqual({
      key: 'Staked 1 SOL',
    });
  });

  it('describes every key it can emit in both locales', async () => {
    const [en, es] = await Promise.all([
      import('../locales/en/translation.json'),
      import('../locales/es/translation.json'),
    ]);
    const enKeys = Object.keys(en.default.transactions.description);
    const esKeys = Object.keys(es.default.transactions.description);

    expect(esKeys).toEqual(enKeys);
    expect(enKeys).toEqual(
      expect.arrayContaining([
        'sendTo',
        'send',
        'receiveFrom',
        'receive',
        'mint',
        'burn',
        'stake',
        'loan',
        'interaction',
        'fallback',
      ])
    );
  });
});

describe('transformSolanaTransaction — token leg images', () => {
  it('routes an ipfs:// leg image through the gateway so the row can draw it', () => {
    const tx = transformSolanaTransaction({
      id: 'sig-nft',
      timestamp: 1_700_000_000,
      status: 'completed',
      type: 'receive',
      description: 'NFT',
      source: 'TOKEN_PROGRAM',
      fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
      inputs: [
        {
          amount: '1',
          decimals: 0,
          symbol: 'MNDFLK',
          name: 'Mindfolk',
          contract: 'Mint111111111111111111111111111111111111111',
          logo: 'ipfs://bafyimage',
          isNft: true,
        },
      ],
      outputs: [],
    } as any);

    expect(tx.inputs[0].logo).toMatch(/^https:\/\//);
    expect(tx.inputs[0].logo).toContain('bafyimage');
  });
});
