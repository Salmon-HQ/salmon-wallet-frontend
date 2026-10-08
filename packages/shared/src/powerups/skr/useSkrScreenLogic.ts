/**
 * useSkrScreenLogic — the SKR tab on both twins (spec 039): reads the
 * position through the shared staking query and lays it out with `skrView`.
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrencyContext } from '../../contexts/CurrencyContext';
import { useSkrStake } from '../../hooks/useStaking';
import type { FactsCardRow } from '../../types/ui/facts-card';
import { skrView } from './skrView';

export interface UseSkrScreenLogicParams {
  publicKey: string;
}

export interface UseSkrScreenLogicResult {
  state: 'loading' | 'error' | 'empty' | 'ready';
  summary: FactsCardRow[];
  history: FactsCardRow[];
  refresh: () => Promise<void>;
}

export function useSkrScreenLogic({ publicKey }: UseSkrScreenLogicParams): UseSkrScreenLogicResult {
  const { t, i18n } = useTranslation();
  const [, { formatValue }] = useCurrencyContext();
  const query = useSkrStake(publicKey);
  // Read once per mount: "staked for N days" does not need to tick.
  const [now] = useState(Date.now);
  const view = useMemo(
    () =>
      query.data
        ? skrView(query.data, {
            t,
            formatValue,
            formatDate: (ms) => new Date(ms).toLocaleDateString(i18n.language),
            now,
          })
        : null,
    [query.data, t, formatValue, i18n.language, now]
  );
  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const state = view ? (view.empty ? 'empty' : 'ready') : query.isError ? 'error' : 'loading';
  return { state, summary: view?.summary ?? [], history: view?.history ?? [], refresh };
}
