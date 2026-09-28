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
  type: 'send',
  status: 'completed',
} as unknown as Transaction;

describe('buildTransactionDeveloperSections', () => {
  it('omits every section for a transaction with none of the fields', () => {
    expect(buildTransactionDeveloperSections(baseTx, t)).toEqual([]);
  });

  it('groups heliusType and accountsInvolved into one untitled top section', () => {
    const tx = { ...baseTx, heliusType: 'TRANSFER', accountsInvolved: 4 } as Transaction;

    const sections = buildTransactionDeveloperSections(tx, t);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeUndefined();
    expect(sections[0].rows).toEqual([
      { key: 'heliusType', label: 'Type', value: 'TRANSFER', labelWeight: 600 },
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
});
