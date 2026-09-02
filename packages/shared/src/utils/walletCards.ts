/**
 * The order the Wallets screen draws its cards in, on both platforms.
 *
 * The cards of one seed sit together: a wallet, then the wallets derived from
 * it, then the next wallet (spec 025 §Wallets). A derived wallet whose parent
 * is gone has nothing to sit under, so it stands on its own rather than
 * disappearing.
 */

interface WalletLike {
  id: string;
  name: string;
  /** The wallet whose seed this one came from, when it is a derived wallet. */
  derivedFrom?: string;
}

export interface WalletCard<A extends WalletLike> {
  account: A;
  /** The parent's name for a derived card's "Derived from {name}" line. */
  parentName: string | undefined;
}

export function orderWalletCards<A extends WalletLike>(accounts: readonly A[]): WalletCard<A>[] {
  const derivedByParent = new Map<string, A[]>();
  const roots: A[] = [];
  for (const account of accounts) {
    const parent = account.derivedFrom
      ? accounts.find(({ id }) => id === account.derivedFrom)
      : undefined;
    if (parent)
      derivedByParent.set(parent.id, [...(derivedByParent.get(parent.id) ?? []), account]);
    else roots.push(account);
  }
  return roots.flatMap((root) => [
    { account: root, parentName: undefined },
    ...(derivedByParent.get(root.id) ?? []).map((child) => ({
      account: child,
      parentName: root.name,
    })),
  ]);
}
