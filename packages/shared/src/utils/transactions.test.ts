import { describe, expect, it } from 'vitest';

import {
  getTransactionDescription,
  transformMultichainTransaction,
  transformSolanaTransaction,
} from './transactions';

describe('transaction utils', () => {
  it('normalizes native Solana token data and infers swap from unknown type', () => {
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
      source: 'JUPITER',
      heliusType: 'SWAP',
    } as any);

    expect(tx.type).toBe('swap');
    expect(tx.outputs[0]).toMatchObject({
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      contract: 'So11111111111111111111111111111111111111112',
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

  it('names send receive and swap descriptions with the parts to interpolate', () => {
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

    expect(
      getTransactionDescription(
        'swap',
        [{ amount: '1', decimals: 9, symbol: 'SOL', contract: 'sol' }],
        [{ amount: '2', decimals: 6, symbol: 'USDC', contract: 'usdc' }]
      )
    ).toEqual({
      key: 'transactions.description.swap',
      values: { from: 'USDC', to: 'SOL' },
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
        'swap',
        'swapMany',
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

  it('passes through swapRoute from the backend SolanaTransaction unchanged', () => {
    const swapRoute = {
      hops: [
        {
          dex: 'JUPITER',
          percent: 100,
          inputToken: { symbol: 'SOL', amount: '1000000000', decimals: 9 },
          outputToken: { symbol: 'USDC', amount: '120000000', decimals: 6 },
        },
      ],
      inputAmount: '1000000000',
      outputAmount: '120000000',
      conversionRate: { fromSymbol: 'SOL', toSymbol: 'USDC', rate: '120.000000' },
    };

    const tx = transformSolanaTransaction({
      id: 'sig-2',
      signature: 'sig-2',
      timestamp: 100,
      status: 'completed',
      type: 'swap',
      inputs: [],
      outputs: [],
      swapRoute,
    } as any);

    expect(tx.swapRoute).toBe(swapRoute);
    expect(tx.swapRoute?.conversionRate?.rate).toBe('120.000000');
  });

  it('leaves swapRoute undefined when the backend does not provide it', () => {
    const tx = transformSolanaTransaction({
      id: 'sig-3',
      signature: 'sig-3',
      timestamp: 100,
      status: 'completed',
      type: 'send',
      inputs: [],
      outputs: [],
    } as any);

    expect(tx.swapRoute).toBeUndefined();
  });
});
