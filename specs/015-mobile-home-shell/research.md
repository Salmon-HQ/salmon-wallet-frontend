# Research: CORE 01 Home / Portfolio → apps/mobile mapping

Feature: [spec.md](./spec.md) · Plan: [plan.md](./plan.md)

Source of truth for structure: `~/Desktop/product.pen`, frame `KDq8P` (read via the Pencil MCP `execute`; NOTE: `filePath` is not honoured — the tool runs against
the tab active in the Pencil app, so keep `product.pen` open there). Source of truth for
aesthetics: `DESIGN.md` (deep-water first; a light mode follows later, so the
`.pen`'s light colours are never copied — everything maps to
`packages/shared/src/theme` tokens).

## Scope decisions (2026-09-01)

- Tab copy: "Tokens" → **Portfolio**. Tabs are **Portfolio | NFTs**; no DeFi tab.
- Swap leaves the bottom tab bar and becomes a **powerup**: the `+` FAB opens a
  stack/sheet that installs it as an extra in-page tab. Flow beyond that TBD.
- Avatar (top-right, salmon mark) opens **Settings** (CORE 11); replaces the
  gear `wallet-header-settings-button`.
- Wallet thumb + name + short address opens the **Wallet switcher** (CORE 10).
- `GlassTabBar` (Home / Collectibles / Swap / Settings) **is removed**.
  Portfolio|NFTs live in-page; swap via FAB; settings via avatar.
- `SubAccountSelector` (derivation-path chips) leaves Home and moves **into the
  Wallet switcher** (CORE 10).
- "History" pill opens `TransactionHistorySheet`. **Final ruling 2026-09-01:** Receive stays a sheet. Send (CORE 04→07) and History/Activity (CORE 08) + Transaction detail (CORE 09) become dedicated stack screens because they carry pressable content (recipients, amount shortcuts, activity rows, explorer/share actions). Built in the next spec-kit feature (016); in feature 015 the pills/circles keep opening today's sheets.
- `+` FAB opens the **POWERUPS 01 Installed launcher** sheet: shortcuts for the
  common powerups; a "browse" entry leads to **POWERUPS 02 Browse** with the
  full catalogue.
- **Keep**: the existing loading screen (`LoadingScreen`, "the wait"); the flesh
  texture (`FleshBackground`) on salmon/orange buttons.
- **Remove**: marine snow (the drifting particles in `DepthBackground` /
  water column). Depth ramp stays.
- Bitcoin stays in Portfolio (chart/market/about as today), no asset detail.
- Sub-tabs always visible; going to NFTs on Bitcoin animates balance → Solana.
- Powerup badges: Official / Community / Featured per `product.pen`.
- **Scroll**: the balance block is **pinned** above the list only on the
  Portfolio tab; on every other scrollable sub-tab (NFTs for now) the balance
  scrolls away with the content.

## Element map

| #   | `.pen` element                             | Today | Where                                                                                                                                                   | Change                                                                                |
| --- | ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Wallet thumb + "Main Wallet" + `7xKf…9mQ2` | ✅    | `src/components/GateContainer/HeaderContent.tsx` (`wallet-header-account-switcher`, `-account-name`, `-copy-address`)                                   | Keep switcher trigger; copy affordance TBD (not in `.pen`).                           |
| 2   | Avatar top-right                           | ⚠️    | `HeaderContent.tsx` `wallet-header-settings-button`                                                                                                     | Same slot, avatar instead of gear; opens `SettingsSheet` → CORE 11.                   |
| 3   | "Total balance" + eye toggle               | ✅    | `BalanceCard/BalanceCardCarousel.tsx` `onToggleVisibility` (`balance-eye-toggle`); state `hiddenBalance`/`toggleHidden` in `app/(app)/(tabs)/index.tsx` | Contract `BalanceCardPropsBase` (shared).                                             |
| 4   | `$12,480.62`                               | ✅    | `BalanceCardCarousel` `usdTotal`                                                                                                                        | Card with logo/caustics → plain number (DESIGN.md `balance` type style).              |
| 5   | "+2.8% this week"                          | ✅    | `BlockchainBalance.changePercent/changeAmount`, rendered in `BalanceCard.tsx`                                                                           | Data exists.                                                                          |
| 6   | "History" pill                             | ✅    | `ActionButtonRow.tsx` `home-activity-button` → `TransactionHistorySheet`                                                                                | Big 3rd button → pill; sheet → full screen (CORE 08).                                 |
| 7   | Dots + "→ BTC"                             | ✅    | `BalanceCardCarousel.tsx` `balance-carousel-dot-{i}`, `onBlockchainChange`                                                                              | Per-chain carousel already exists.                                                    |
| 8   | Send / Receive 42px circles                | ✅    | `ActionButtonRow.tsx` `home-send-button`, `home-receive-button` → `SendSheet` / `ReceiveSheet`                                                          | Contract `ActionButtonRowPropsBase` (send/receive/activity).                          |
| 9   | In-page tabs Portfolio \| NFTs             | ⚠️    | Routes in `GlassTabBar`: `index`, `collectibles`                                                                                                        | Bottom tab bar → in-page segmented; `collectibles.tsx` content becomes the NFTs tab.  |
| 10  | Portfolio visibility button (36px)         | ❌    | none (no hide-token / spam / zero-balance logic in shared or mobile)                                                                                    | New → CORE 16.                                                                        |
| 11  | Asset row card                             | ✅    | `TokenList/TokenListItem.tsx` `token-row-{SYMBOL}`, `TokenLogo`, `TokenBadges` → `TokenInformationSheet` (→ CORE 02)                                    | Row → card r16, pad 16.                                                               |
| 12  | `+` FAB powerups                           | ❌    | none; `powerup` absent from `apps/mobile` and `packages/shared`                                                                                         | New. Swap today = `app/(app)/(tabs)/swap.tsx` + `SwapScreen` (hidden for watch-only). |

## Removed from Home

- `SubAccountSelector` (`index.tsx` ~l.855) → Wallet switcher.
- `GlassTabBar` (`app/(app)/(tabs)/_layout.tsx` ~l.894) → removed.

## Other screens in `product.pen` (redesign scope)

CORE 02 Asset detail · 03 Receive · 04 Send recipient (+04A wrong network,
04B uninitialized wallet) · 05 Send amount · 06 Send review · 07 Send success ·
08 Activity · 09 Transaction detail · 10 Wallet switcher · 11 Settings ·
12 Security · 13 Portfolio empty · 14 Portfolio loading · 15 Portfolio error ·
16 Portfolio visibility · POWERUPS 01 Installed launcher · 02 Browse ·
03 Community detail · 04 Community risk consent · 05 Swap installed ·
06 Swap review · 07 Swap success · AUTH 01 Wallet locked · 02 Forgot password.

## Deltas the `.pen` omits but today's app has — owner rulings (2026-09-01)

Rule: when the mock omits something a component has today, ask before dropping.

| Delta                                                      | Ruling                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Token rows: per-token price + 24h change                   | **Keep** (secondary line: ticker · price · change)      |
| Header avatar fallback: initials on per-account colour     | **Drop** — salmon mark always when no image (as `.pen`) |
| Balance change: absolute amount next to %                  | **Keep** ("+$61.45 · +2.8% 24h")                        |
| Copy-address button in header                              | Keep                                                    |
| Pull-to-refresh, top fade gradient, dev-mode network label | Keep                                                    |
| Asset detail (CORE 02, later): chart time-range selector   | **Keep** — owner's example; `PriceChart` periods stay   |

- Balance next-chain hint: arrow points in the swipe direction ("→ BTC" on Solana, "← SOL" on Bitcoin).
- Tab ↔ chain coupling is one-way (owner ruling 2026-09-01, UX rationale: never block a
  learned gesture; the balance is information, not navigation): entering a
  chain-specific tab (NFTs) while on Bitcoin animates the balance to Solana; the user
  may swipe back to Bitcoin on that tab — tab and content stay, no empty state; returning
  to Portfolio does not reset the chain.
- DESIGN.md §Sheets now carries the state rule: one state → sheet; more than one
  state (steps, pressable rows, actions that open actions) → dedicated screen.
  Consequences for later features: Send (04–07), Activity (08) + Tx detail (09),
  and NFT detail (send/burn lead to more actions) become screens; Receive and
  Token information stay sheets.
- Settings (CORE 11) and the Wallet switcher (CORE 10) become **screens** (state rule),
  not the gate/sheet. CORE 10 adds new behaviour: aggregated balance card across
  wallets, per-wallet "include in total" toggle, inline rename, add wallet — scope for
  feature 016/017, not 015. Note: CORE 11 frame in `product.pen` currently has height 0
  (empty) — ask the owner before building Settings.
- Screen gutter rule applies to every Home sub-tab's content (enforced by the
  container, not per tab).

## Sheet vs screen — final inventory (owner rulings 2026-09-01)

| Surface today                                      | Ruling                                                                                                 | Feature     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------- |
| `ReceiveSheet`                                     | sheet                                                                                                  | —           |
| `ConfirmSheet`                                     | sheet                                                                                                  | —           |
| `TokenSelectorModal`                               | sheet                                                                                                  | —           |
| `PowerupsLauncherSheet`                            | sheet                                                                                                  | 015         |
| `TokenInformationSheet`                            | **screen** (CORE 02, keeps chart ranges, market data, about)                                           | 017         |
| `SendSheet`                                        | **screens** CORE 04–07                                                                                 | 017         |
| `TransactionHistorySheet`                          | **screens** CORE 08 + 09                                                                               | 017         |
| `NftDetailSheet`                                   | **screen**                                                                                             | 017         |
| `SettingsSheet` (gate)                             | **screen** + sub-screens, current IA restyled until the `.pen` CORE 11 is drawn (frame is empty today) | 016         |
| `WalletSwitcherSheet` (gate)                       | **screen** CORE 10 (new: aggregated balance, include-in-total, rename, add)                            | 016         |
| `NftSeeAllSheet`, `NftCarouselSection` (+skeleton) | **delete** — dead code, commented out in `NftsTab`                                                     | 015 cleanup |

- 2026-09-01 (afternoon): token badges removed everywhere on mobile (`TokenBadges`,
  `tokenTagMeta`, `TokenBadgesSection` deleted; shared `Token.tags` stays for web/ext).
  Header: profile picture (38, rounded) on the LEFT → wallet switcher; gear (36 circle)
  on the RIGHT → settings; no wallet glyph. Header top = safe-area + 28 exactly; the
  row is content-height (no 56-pt slot).
