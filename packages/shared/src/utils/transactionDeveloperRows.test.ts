import { describe, expect, it, vi } from 'vitest';

import { buildTransactionDeveloperSections } from './transactionDeveloperRows';
import type { Transaction } from '../types';

const t = vi.fn((key: string, optionsOrDefault?: string | Record<string, unknown>) => {
  if (typeof optionsOrDefault === 'string') return optionsOrDefault;
  if (optionsOrDefault && 'count' in optionsOrDefault) return `${optionsOrDefault.count} inner`;
  return key;
});

const baseTx = {
  id: 'tx-1',
  timestamp: 0,
  type: 'swap',
  status: 'completed',
} as unknown as Transaction;

describe('buildTransactionDeveloperSections', () => {
  it('omits every section for a transaction with none of the fields', () => {
    expect(buildTransactionDeveloperSections(baseTx, t)).toEqual([]);
  });

  it('groups heliusType and accountsInvolved into one untitled top section', () => {
    const tx = { ...baseTx, heliusType: 'SWAP', accountsInvolved: 4 } as Transaction;

    const sections = buildTransactionDeveloperSections(tx, t);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeUndefined();
    expect(sections[0].rows).toEqual([
      { key: 'heliusType', label: 'Type', value: 'SWAP', labelWeight: 600 },
      { key: 'accountsInvolved', label: 'Accounts Involved', value: '4', labelWeight: 600 },
    ]);
  });

  it('builds a Programs row per instruction, with inner count only when present', () => {
    const tx = {
      ...baseTx,
      instructions: [
        { programId: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', innerInstructionsCount: 0 },
        { programId: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', innerInstructionsCount: 2 },
      ],
    } as unknown as Transaction;

    const sections = buildTransactionDeveloperSections(tx, t);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Programs');
    expect(sections[0].rows[0].value).toBe('');
    expect(sections[0].rows[1].value).toBe('2 inner');
  });

  it('builds one Swap Fees section combining native and token fees', () => {
    const tx = {
      ...baseTx,
      swapFees: {
        nativeFees: [{ account: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', amount: '0.01' }],
        tokenFees: [
          {
            account: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            amount: '1.5',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
        ],
      },
    } as unknown as Transaction;

    const sections = buildTransactionDeveloperSections(tx, t);

    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('swapFees');
    expect(sections[0].rows).toHaveLength(2);
    expect(sections[0].rows[0].value).toBe('0.01 SOL');
    expect(sections[0].rows[1].value).toContain('1.5 (');
  });
});
