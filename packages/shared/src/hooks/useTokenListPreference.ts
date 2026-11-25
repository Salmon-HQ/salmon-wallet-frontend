/**
 * The token list preference as Home and Settings use it (spec 044): which
 * tokens Home renders and whether the list is unfolded, and the copy the
 * Settings row and screen print. The rule itself is `foldTokenList`.
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrencyContext } from '../contexts/CurrencyContext';
import { useTokenListPreference } from '../contexts/DeveloperModeContext';
import type { Token } from '../types/ui';
import {
  foldTokenList,
  TOKEN_LIST_COUNT_PRESETS,
  TOKEN_LIST_MIN_VALUE_PRESETS,
} from '../utils/tokenListFold';

/**
 * One per Home. The list folds again on another wallet, account or network,
 * or a new preference; nothing is stored, so a relaunch starts folded. Home
 * stays mounted under every screen it opens, so a token visit and back keeps
 * the list as the user left it (owner, 2026-11-25).
 */
export function useTokenListFold({
  tokens,
  address,
  networkId,
}: {
  tokens: Token[];
  /** The active account's receive address: it changes with the wallet and the account. */
  address: string | undefined;
  networkId: string | undefined;
}): {
  tokens: Token[];
  foldedCount: number;
  expanded: boolean;
  toggle: () => void;
} {
  const { tokenListPreference } = useTokenListPreference();
  const [, { convert }] = useCurrencyContext();
  const { visible, folded } = useMemo(
    () => foldTokenList(tokens, tokenListPreference, convert),
    [tokens, tokenListPreference, convert]
  );

  // A key that comes back (another network, then this one again) must not find
  // the list still open, so the state remembers the key it was opened under.
  const foldKey = `${address}|${networkId}|${tokenListPreference.maxCount}|${tokenListPreference.minValue}`;
  const [open, setOpen] = useState({ key: foldKey, expanded: false });
  if (open.key !== foldKey) setOpen({ key: foldKey, expanded: false });
  const expanded = open.key === foldKey && open.expanded;

  const toggle = useCallback(
    () =>
      setOpen((state) => ({ key: foldKey, expanded: state.key === foldKey && !state.expanded })),
    [foldKey]
  );

  const shown = useMemo(
    () => (expanded ? [...visible, ...folded] : visible),
    [expanded, visible, folded]
  );

  return { tokens: shown, foldedCount: folded.length, expanded, toggle };
}

interface TokenListOption {
  key: string;
  value: number | null;
  label: string;
}

/** Both option lists of the Settings screen and the row's trailing value. */
export function useTokenListLabels(): {
  countOptions: TokenListOption[];
  minValueOptions: TokenListOption[];
  rowValue: string;
} {
  const { t } = useTranslation();
  const { tokenListPreference } = useTokenListPreference();
  const [{ exchangeRate }, { formatValue }] = useCurrencyContext();
  const { maxCount, minValue } = tokenListPreference;

  return useMemo(() => {
    const count = (n: number) => t('settings.token_list_count', { count: n });
    // The presets are numbers in the display currency; formatValue takes dollars.
    const money = (value: number) => formatValue(value / exchangeRate);

    const countOptions = [
      { key: 'all', value: null, label: t('settings.token_list_all') },
      ...TOKEN_LIST_COUNT_PRESETS.map((n) => ({ key: String(n), value: n, label: count(n) })),
    ];
    const minValueOptions = [
      { key: 'off', value: null, label: t('settings.token_list_off') },
      ...TOKEN_LIST_MIN_VALUE_PRESETS.map((v) => ({ key: String(v), value: v, label: money(v) })),
    ];

    const parts = [
      maxCount !== null ? count(maxCount) : null,
      minValue !== null ? t('settings.token_list_from', { value: money(minValue) }) : null,
    ].filter((part): part is string => part !== null);

    return {
      countOptions,
      minValueOptions,
      rowValue: parts.length > 0 ? parts.join(' · ') : t('settings.token_list_all'),
    };
  }, [t, formatValue, exchangeRate, maxCount, minValue]);
}
