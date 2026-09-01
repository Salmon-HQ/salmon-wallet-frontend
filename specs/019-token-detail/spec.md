# Feature Specification: Token detail and NFT detail as screens (CORE 02)

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `019-token-detail`)
**Created**: 2026-09-01 · **Status**: Draft — open questions below block dispatch

Token information and the NFT detail leave their sheets and become stack screens per the state rule (`DESIGN.md` §Sheets). Structural source: `product.pen` CORE 02 · Asset detail (`IWFCn`). There is **no NFT detail frame in the .pen**; the NFT screen follows CORE 02's skeleton plus today's `NftDetailSheet` content. Right-slide navigation (017); flesh/kit/theme rules of 015/016; the 20-pt component gap rule.

## What CORE 02 draws (390×844, vertical, gap 20)

1. `ScreenHeader` — back, title = chain/token name 20/700 (DESIGN.md standard is 24/700), subtitle = ticker 13/500.
2. Asset balance block: token bubble 42 + name 18/700; amount 36/700 ("24.08 SOL"); fiat 14/500.
3. Asset actions: two half-width action refs — **Send**, **Receive** (170 each, 10 gap).
4. Performance `Card`: `KeyValueRow` "Current price"; line chart 120 tall, edge-to-edge inside the card; `KeyValueRow` "7D change" (+4.2%).
5. `SectionLabel` "Recent activity" 16/700 + `Card` of two `KeyValueRow`s (label = tx kind, value = signed amount).

## Deltas — exists today, absent from the mock (rulings needed)

| # | Today (`TokenInformationSheet`) | CORE 02 | Proposal |
|---|---|---|---|
| D1 | `PriceChart` with period selector (1D/1W/1M/…) | single 7-day line, no selector | **Keep periods** (already ruled in handoff). Selector = `UnderlineTabs` inside the card; "7D change" row becomes "{period} change". |
| D2 | `TokenMarketData` (market cap, volume, supply…) | absent | **Keep** (handoff ruling) as a `Card` of `KeyValueRow`s under Performance. |
| D3 | `TokenAbout` (description) + contract address copy + website link | absent | **Keep** (handoff ruling) as the last `Card`. |
| D4 | — | Send / Receive actions on the asset | New. Send pushes `/send` with the token preselected (needs the send flow context to accept an initial token); Receive opens the existing Receive sheet (CORE 03). Ruling: build now or defer? |
| D5 | — | Recent activity per asset | New. Filter `useTransactions` rows by mint/symbol, take 3, row tap → today's transaction detail; "See all" → `/activity`. Ruling: build now or defer to CORE 09? |
| D6 | Bitcoin | — | **No BTC detail** (handoff ruling): BTC row on Portfolio is not pressable. |
| D7 | `NftDetailSheet` 1265 lines: image, attributes, send (address → review → success) and burn (review → success) as in-sheet steps | no frame | Screen with image hero + attributes `Card` + actions; send/burn become pushed steps (`/nft/[id]/send`, `/nft/[id]/burn`) reusing the sheet's step bodies and `useNftTransfer`. Ruling: confirm shape, or keep the sheet for now and ship token detail alone. |

## User Stories

### US1 — Open a token (P1)
Portfolio row tap pushes `/token/[id]` (Solana mint or `sol`). Screen = CORE 02 with D1–D3 kept. Data loading exactly as Home does today (`getTokenMarketChart`, `getTokenCoinInfo`, `coinInfoToMarketData`) but moved out of `(tabs)/index.tsx` into a hook the route owns; Home loses the eight `selectedToken*` states.

### US2 — Act on a token (P2, pending D4/D5)
Send / Receive actions and Recent activity as ruled.

### US3 — Open an NFT (P1, pending D7)
NFT card tap pushes `/nft/[id]`; send/burn as pushed steps.

## Requirements
- FR-001 Routes `/token/[id]` and `/nft/[id]` on the `(app)` stack, right-slide. Route params: never name a dynamic segment `[screen]` (reserved — see `settings/[panel].tsx`).
- FR-002 Reuse `PriceChart`, `TokenMarketData`, `TokenAbout`, `useTransactions`, `useNftTransfer`; delete `TokenInformationSheet` and `NftDetailSheet` (+ barrels, tests, README) once nothing imports them. Ask before deleting `TokenInformationSheetPropsBase` in shared (web/extension consumers).
- FR-003 Kit-only composition; 20-pt sibling gaps; `ScreenHeader` 24/700 + 14/500 (DESIGN.md wins over the mock's 20/13).
- FR-004 Every string EN+ES; new Spanish never guessed — mark `[ES?]`.
- FR-005 testIDs per `e2e-test-labels`; Maestro flows touching token/NFT sheets re-pointed (not run).
- FR-006 Lock overlay covers the screens; hidden-balance state masks amount and fiat.
