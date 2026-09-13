/**
 * useTokenSelectList — what the token picker's list decides before it draws
 * a row, once for both twins: which tokens are offered (the verified ones,
 * unless the developer toggle shows the rest), and the search over them —
 * local over the list in hand, or the catalogue when `onSearch` is given.
 */
import { useMemo } from 'react';
import { useUnverifiedTokens } from '../contexts/DeveloperModeContext';
import type { SendToken } from '../types/ui/send-sheet';
import { formatTokenAmount } from '../utils/formatting';
import { useTokenSearch, type UseTokenSearchResult } from './useTokenSearch';

export interface UseTokenSelectListOptions<T extends SendToken> {
  /** Offer only tokens with a meaningful tag, unless the developer toggle shows all. */
  verifiedOnly?: boolean;
  onSearch?: (query: string) => Promise<T[]>;
}

/** The row's trailing balance: "0 SOL", "<0.0001 SOL", "1.25 SOL". */
export function tokenBalanceLabel(token: SendToken): string {
  const amount = typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
  if (amount === 0) return `0 ${token.symbol}`;
  // The floor reads in the app's language too — a hardcoded '<0.0001' put an
  // English decimal point next to a Spanish one in the row below it.
  if (amount < 0.0001) return `<${formatTokenAmount(0.0001)} ${token.symbol}`;
  return `${formatTokenAmount(amount)} ${token.symbol}`;
}

export function useTokenSelectList<T extends SendToken>(
  tokens: T[],
  { verifiedOnly = true, onSearch }: UseTokenSelectListOptions<T> = {}
): UseTokenSearchResult<T> {
  // Spec 026 D4: the unverified-tokens toggle owns this, read where it is used.
  const showUnverifiedTokens = useUnverifiedTokens();
  const verifiedTokens = useMemo(
    () =>
      verifiedOnly
        ? tokens.filter((token) => {
            const hasMeaningfulTags =
              token.tags && token.tags.length > 0 && token.tags.some((tag) => tag !== 'unknown');
            return hasMeaningfulTags || !!showUnverifiedTokens;
          })
        : tokens,
    [tokens, showUnverifiedTokens, verifiedOnly]
  );
  return useTokenSearch(verifiedTokens, onSearch);
}
