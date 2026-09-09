/**
 * The shape the Wallets screen draws, on both platforms: families.
 *
 * A wallet and the wallets derived from it form one family (spec 025
 * §Wallets, amended 2026-09-09): the parent's card, then the derived cards
 * tied to it by a rail. A derived wallet whose parent is gone has nothing to
 * hang from, so it heads a family of its own rather than disappearing.
 */

interface WalletLike {
  id: string;
  /** The wallet whose seed this one came from, when it is a derived wallet. */
  derivedFrom?: string;
}

export interface WalletFamily<A extends WalletLike> {
  parent: A;
  /** In list order; empty for a wallet nothing was derived from. */
  derived: A[];
}

export function groupWalletFamilies<A extends WalletLike>(
  accounts: readonly A[]
): WalletFamily<A>[] {
  const ids = new Set(accounts.map(({ id }) => id));
  const derivedByParent = new Map<string, A[]>();
  const parents: A[] = [];
  for (const account of accounts) {
    const parentId =
      account.derivedFrom && ids.has(account.derivedFrom) ? account.derivedFrom : null;
    if (parentId)
      derivedByParent.set(parentId, [...(derivedByParent.get(parentId) ?? []), account]);
    else parents.push(account);
  }
  return parents.map((parent) => ({ parent, derived: derivedByParent.get(parent.id) ?? [] }));
}
