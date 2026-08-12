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

  it('builds readable descriptions for send receive and swap transactions', () => {
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
    ).toContain('To ');

    expect(
      getTransactionDescription(
        'receive',
        [{ amount: '1', decimals: 9, symbol: 'SOL', contract: 'mint', source: 'ABCDEFGH12345678' }],
        []
      )
    ).toContain('From ');

    expect(
      getTransactionDescription(
        'swap',
        [{ amount: '1', decimals: 9, symbol: 'SOL', contract: 'sol' }],
        [{ amount: '2', decimals: 6, symbol: 'USDC', contract: 'usdc' }]
      )
    ).toBe('USDC to SOL');
  });

  it('falls back to transaction type labels when description is missing or unknown', () => {
    expect(getTransactionDescription('mint', [], [], undefined, 'Unknown instruction')).toBe(
      'Token minted'
    );
    expect(getTransactionDescription('interaction', [], [])).toBe('Contract interaction');
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
