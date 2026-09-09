import { describe, expect, it } from 'vitest';
import { groupWalletFamilies } from './walletCards';

const w = (id: string, derivedFrom?: string) => ({ id, name: `Wallet ${id}`, derivedFrom });

describe('groupWalletFamilies', () => {
  it("ties a seed's derived wallets to their parent, in list order", () => {
    const families = groupWalletFamilies([w('a'), w('b'), w('a1', 'a'), w('a2', 'a')]);
    expect(families.map((f) => f.parent.id)).toEqual(['a', 'b']);
    expect(families[0].derived.map((d) => d.id)).toEqual(['a1', 'a2']);
    expect(families[1].derived).toEqual([]);
  });

  it('lets an orphaned derived wallet head a family of its own instead of disappearing', () => {
    const families = groupWalletFamilies([w('x', 'gone'), w('b')]);
    expect(families.map((f) => f.parent.id)).toEqual(['x', 'b']);
    expect(families[0].derived).toEqual([]);
  });

  it('is one family per wallet on a list with no derived wallets', () => {
    expect(groupWalletFamilies([w('a'), w('b')]).map((f) => f.parent.id)).toEqual(['a', 'b']);
  });
});
