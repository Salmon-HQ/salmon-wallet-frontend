/**
 * The rows the derived-accounts sheet draws, and which of them are still taken.
 *
 * Both sheets ask the same question about the same finds — the name a find
 * would become, and whether the user left it taken — so the answer's state
 * lives here once instead of once per platform. Nothing in it is visual, and
 * nothing in it touches key material: a find is an index and an address the
 * scan already produced.
 *
 * @module hooks/useDerivedFindRows
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DerivedAccountFind } from './useDerivedAccountsScan';

/** A find under the name the wallet it becomes would carry. */
export interface DerivedFindRow extends DerivedAccountFind {
  name: string;
}

export interface UseDerivedFindRowsResult {
  /** The finds, named in the order they would be created. */
  rows: DerivedFindRow[];
  /** The derivation indexes still taken — every find arrives taken. */
  checked: number[];
  /** Takes a find, or puts it back. */
  toggle: (index: number) => void;
}

/**
 * @param finds            - What the scan found.
 * @param heldAccountCount - Wallets the user already holds; the names continue
 *                           from there, exactly as the add-account panel names.
 * @param t                - Passed in rather than read from `i18next` here, so
 *                           the sheet renames itself when the language changes.
 */
export function useDerivedFindRows(
  finds: DerivedAccountFind[],
  heldAccountCount: number,
  t: (key: string, options: { number: number }) => string
): UseDerivedFindRowsResult {
  // Every find arrives taken: a funded path is almost always the user's own
  // money, and unchecking is cheaper than hunting for the same accounts by hand.
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => {
    setChecked(finds.map(({ index }) => index));
  }, [finds]);

  const rows = useMemo(
    () =>
      finds.map((find, position) => ({
        ...find,
        name: t('settings.account_add.default_name', { number: heldAccountCount + 1 + position }),
      })),
    [finds, heldAccountCount, t]
  );

  const toggle = useCallback((index: number) => {
    setChecked((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
    );
  }, []);

  return { rows, checked, toggle };
}
