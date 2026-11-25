# Data model: Token list preferences (spec 044)

One thing is stored: the user's two choices, inside the settings record the device already keeps. Everything else is derived on each render from the balance list, the choices and the display currency.

## TokenListPreference (stored)

A new optional field of `UserConfig` (`packages/shared/src/types/account.ts`), saved under the existing `STORAGE_KEYS.SETTINGS` record by `useUserConfig`. No new storage key.

| Field      | Type             | Rule                                                                                          |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `maxCount` | `number \| null` | One of `TOKEN_LIST_COUNT_PRESETS` = `3, 5, 10, 20`; `null` = All (FR-003)                     |
| `minValue` | `number \| null` | One of `TOKEN_LIST_MIN_VALUE_PRESETS` = `1, 5, 10, 50`, in the display currency; `null` = Off |

- **Absent field** (every existing install, every fresh install) reads as `{ maxCount: null, minValue: null }` (FR-004). Nothing is written until the user picks.
- **Invalid value** (not a preset, not a number, a negative, `NaN`) reads as `null` for that half, by `normalizeTokenListPreference`. A bad record can only show more tokens.
- **Scope**: one per install; every wallet, account and network reads the same value (FR-006). Not synced.
- **Writes** go through `useUserConfig`'s read-modify-write queue (research R4), so no other setting's write can erase it and it erases no other.

## Token (input, unchanged)

The kit's `Token` (`packages/shared/src/types/ui.ts:30`) as `mapBalanceToToken` produces it. The rule reads three things:

| Read                 | Meaning for the rule                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `address`            | `isNativeSol(address)` → native; `STAKED_SOL_KEY` / `STAKED_SKR_KEY` → staked position               |
| `usdBalance`         | `null`, `undefined` or not finite → no price; otherwise `convert(usdBalance)` is the displayed value |
| position in the list | the list's own order (native first, then by value); the rule never re-sorts                          |

## TokenListFold (derived, never stored)

`foldTokenList(tokens, preference, convert)` returns:

| Field     | Type      | Rule                                                                                                   |
| --------- | --------- | ------------------------------------------------------------------------------------------------------ |
| `visible` | `Token[]` | The tokens both rules let through, in input order                                                      |
| `folded`  | `Token[]` | Every other token, in input order. `visible.length + folded.length === tokens.length`, nothing dropped |

Per token, walking the list in order with a place counter that starts at 0:

1. **Staked position** → `visible`; the counter does not move (FR-013).
2. Otherwise the token takes the next place: `inCount = maxCount === null || place < maxCount`, then `place += 1` (FR-010).
3. `worthEnough = minValue === null || native || (priced && convert(usdBalance) >= minValue)` (FR-011). A token with no price is not worth enough when a threshold is set.
4. `inCount && worthEnough` → `visible`, else → `folded` (FR-012).

With both halves `null`, `visible` is the input and `folded` is empty (SC-003).

## FoldState (derived, in memory)

`useTokenListFold({ tokens, address, networkId })`, one per Home.

| Field         | Type         | Rule                                                                                                   |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `expanded`    | `boolean`    | `false` on mount; back to `false` whenever the address, the network or the preference changes (FR-015) |
| `tokens`      | `Token[]`    | `expanded ? [...visible, ...folded] : visible` — what the Home list renders                            |
| `foldedCount` | `number`     | `folded.length`; the "Show more" row renders only when it is above 0 and the list has loaded           |
| `toggle`      | `() => void` | Flips `expanded`                                                                                       |

`address` is the active account's receive address (it changes with the wallet and with the account). Leaving Home for a token or any other screen does not fold the list: both Homes stay mounted, so the state is still there on return (owner Q1, 2026-11-25; research R6).

## State transitions

```text
          tap "Show more"                 tap "Show less"
FOLDED ───────────────────▶ EXPANDED ───────────────────▶ FOLDED
   ▲                            │
   └── wallet, account or network changes / preference changes / relaunch
       (a token visit or any other screen and back: no change)
```

A list with `foldedCount === 0` has no row and no state to show; a later price refresh that folds a token shows the row in the FOLDED state.
