import { describe, expect, it } from 'vitest';
import { orderWalletCards } from './walletCards';

const w = (id: string, derivedFrom?: string) => ({ id, name: `Wallet ${id}`, derivedFrom });

describe('orderWalletCards', () => {
  it("sits a seed's derived wallets under their parent, in list order", () => {
    const cards = orderWalletCards([w('a'), w('b'), w('a1', 'a'), w('a2', 'a')]);
    expect(cards.map((c) => c.account.id)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(cards.map((c) => c.parentName)).toEqual([undefined, 'Wallet a', 'Wallet a', undefined]);
  });

  it('lets an orphaned derived wallet stand on its own instead of disappearing', () => {
    const cards = orderWalletCards([w('x', 'gone'), w('b')]);
    expect(cards.map((c) => c.account.id)).toEqual(['x', 'b']);
    expect(cards[0].parentName).toBeUndefined();
  });

  it('is the identity on a list with no derived wallets', () => {
    expect(orderWalletCards([w('a'), w('b')]).map((c) => c.account.id)).toEqual(['a', 'b']);
  });
});
