# Contract: the shared folding rule and its hooks (spec 044)

Everything that decides lives in `packages/shared`, once. The apps only draw what these return (FR-019).

## `packages/shared/src/utils/tokenListFold.ts` (new, pure, no React)

```ts
export const TOKEN_LIST_COUNT_PRESETS = [3, 5, 10, 20] as const;
export const TOKEN_LIST_MIN_VALUE_PRESETS = [1, 5, 10, 50] as const;

export interface TokenListPreference {
  /** null = All */
  maxCount: number | null;
  /** In the display currency; null = Off */
  minValue: number | null;
}

export const DEFAULT_TOKEN_LIST_PREFERENCE: TokenListPreference; // { maxCount: null, minValue: null }

/** Anything that is not a preset reads as off, half by half. */
export function normalizeTokenListPreference(raw: unknown): TokenListPreference;

export function foldTokenList<T extends Pick<Token, 'address' | 'usdBalance'>>(
  tokens: readonly T[],
  preference: TokenListPreference,
  convert: (usd: number) => number
): { visible: T[]; folded: T[] };
```

The walk is in data-model.md (TokenListFold). `convert` is `useCurrencyContext()[1].convert`, the multiplication behind every row's printed value (research R3).

### Unit tests, written first (`tokenListFold.test.ts`, Vitest)

`convert = (usd) => usd` unless the case says otherwise. Token names below are addresses; `SOL` is `SOL_CONSTANTS.ADDRESS`; `sSOL`/`sSKR` are `STAKED_SOL_KEY`/`STAKED_SKR_KEY`.

| #   | Input (address:usdBalance, in order)                  | Preference  | `visible`             | `folded`        | Pins                                                                                           |
| --- | ----------------------------------------------------- | ----------- | --------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| 1   | SOL:2, A:120, B:40, C:6, D:4.99, E:0.02               | null / null | all six               | —               | SC-003                                                                                         |
| 2   | ten tokens, SOL first                                 | 3 / null    | SOL and the next two  | the other seven | US1 AC1, FR-010                                                                                |
| 3   | SOL:2, A:120                                          | 3 / null    | both                  | —               | US1 AC2                                                                                        |
| 4   | exactly N tokens                                      | N / null    | all                   | —               | boundary                                                                                       |
| 5   | SOL:2, A:120, B:40, C:6, D:4.99, E:0.02, F:no price   | null / 5    | SOL, A, B, C          | D, E, F         | US2 test                                                                                       |
| 6   | A:5                                                   | null / 5    | A                     | —               | US2 AC1 (exact X)                                                                              |
| 7   | A:4.999999                                            | null / 5    | —                     | A               | strict below                                                                                   |
| 8   | F:null, G:undefined, H:NaN, I:Infinity                | null / 1    | —                     | all four        | US2 AC2                                                                                        |
| 9   | F:null, G:undefined                                   | null / null | both                  | —               | unpriced, no threshold                                                                         |
| 10  | SOL:0.10, A:120                                       | null / 50   | SOL, A                | —               | US2 AC3                                                                                        |
| 11  | SOL:2, A:120, B:40, C:6                               | 3 / 5       | SOL, A, B             | C               | US2 AC4 (count)                                                                                |
| 12  | SOL:2, A:120, B:3, C:60                               | 3 / 5       | SOL, A                | B, C            | both rules: B by value, C by place                                                             |
| 13  | SOL:2, A:4, B:3 (devnet: only SOL priced → A, B null) | null / 1    | SOL                   | A, B            | devnet edge                                                                                    |
| 14  | A:4, `convert = usd => usd * 1.5` (A shows 6)         | null / 5    | A                     | —               | US2 AC6                                                                                        |
| 15  | A:4, `convert = usd => usd * 0.5` (A shows 2)         | null / 5    | —                     | A               | US2 AC6                                                                                        |
| 16  | SOL:2, sSOL:0.5, sSKR:0.5, A:120, B:40, C:6           | 3 / null    | SOL, sSOL, sSKR, A, B | C               | US3 AC2, staked rows + SOL exceed N                                                            |
| 17  | SOL:2, sSOL:0.5, sSKR:0.01, A:120                     | null / 50   | SOL, sSOL, sSKR, A    | —               | US3 AC1                                                                                        |
| 18  | sSOL:no price, A:1                                    | 1 / 5       | sSOL                  | A               | staked never folded, even unpriced                                                             |
| 19  | any input                                             | any         | —                     | —               | `visible ∪ folded` is the input, each in input order, nothing duplicated (fast-check property) |
| 20  | input array                                           | any         | —                     | —               | input not mutated                                                                              |

`normalizeTokenListPreference` cases: `undefined`, `null`, `{}` → default; `{ maxCount: 3, minValue: 5 }` → kept; `{ maxCount: 4 }`, `{ maxCount: '3' }`, `{ maxCount: -1 }`, `{ minValue: NaN }`, `{ minValue: 2 }` → that half `null`, the other half kept.

## `packages/shared/src/hooks/useTokenListPreference.ts` (new)

```ts
/** One per Home. Reads the preference (DeveloperModeContext) and convert (CurrencyContext).
 *  Folds again on a new address, network or preference; a token visit and back keeps it (owner Q1). */
export function useTokenListFold(args: {
  tokens: Token[];
  address: string | undefined;
  networkId: string | undefined;
}): {
  tokens: Token[]; // what the list renders
  foldedCount: number;
  expanded: boolean;
  toggle: () => void;
};

/** The Settings copy: both option lists and the row's trailing value. */
export function useTokenListLabels(): {
  countOptions: { key: string; value: number | null; label: string }[]; // 'all', '3', …
  minValueOptions: { key: string; value: number | null; label: string }[]; // 'off', '1', …
  rowValue: string; // "All" | "3 tokens" | "from €5.00" | "3 tokens · from €5.00"
};
```

`useTokenListLabels` prints a threshold with `formatValue(minValue / exchangeRate)` (research R3). Tests (`useTokenListPreference.test.tsx`, jsdom, the providers mocked the way `CurrencyContext.test.tsx` and `useUserConfig.*.test.tsx` do): fold follows a preference change without remount; `expanded` returns to false on a new address, a new network and a preference change, and stays true across rerenders with the same address and network (owner Q1); `tokens` is `visible` then `folded` when expanded; row value in each of the four shapes, in USD and EUR.

## `packages/shared/src/contexts/DeveloperModeContext.tsx` (changed)

`DeveloperModeContextValue` gains `tokenListPreference: TokenListPreference` and `setTokenListPreference: (next: TokenListPreference) => Promise<void>`, fed by the provider's existing `useUserConfig` instance; the default value carries `DEFAULT_TOKEN_LIST_PREFERENCE` and a no-op. New reader: `useTokenListPreference()` returning both. Existing readers (`useDeveloperMode`, `useUnverifiedTokens`, `useDeveloperModeSettings`) are unchanged.

## `packages/shared/src/hooks/useUserConfig.ts` (changed)

- First commit (the bug, research R4): a module-level `persistPatch(patch: Partial<UserConfig>): Promise<UserConfig>` serialised on one promise chain; every setter writes only its own field through it; the mount-time defaults write happens only when a default was missing. Public result type unchanged.
- Feature commit: `tokenListPreference` (normalised) and `setTokenListPreference(next)` in `UseUserConfigResult`, written through `persistPatch({ tokenList: next })`.

The function compares the number `convert` returns. `useTokenListFold` passes a `convert` that rounds to the decimals the display currency prints, so the comparison is with the value the row shows (owner, 2026-11-25): 4.996 reads 5.00 and stays visible under a minimum of 5.
