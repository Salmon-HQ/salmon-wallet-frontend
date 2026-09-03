# Feature Specification: Mobile redesign — Home shell (CORE 01) + shared UI primitives

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `015-mobile-home-shell`; the branch pre-dates the spec and is kept)

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "Mobile redesign: Home shell (CORE 01) + shared UI primitives"

Structural source of truth: the Pencil file `product.pen` (screens CORE 01–16,
POWERUPS 01–07, AUTH 01–02). Aesthetic source of truth: `DESIGN.md`
(deep-water first; a light mode follows in a later feature). This feature
covers the first slice — the Home screen and the reusable building blocks that
every later screen composes from. Later slices: Powerups launcher/browse, the
Send/Receive/Activity screens, switcher/settings/portfolio states, auth.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See my money at a glance (Priority: P1)

As a wallet user I open the app and see, on one screen, who I am (wallet name +
short address), my total balance for the active chain, how it moved in the last
24 hours, and my assets — without a bottom tab bar taking space.

**Why this priority**: it is the screen every session starts on; everything
else hangs off it.

**Independent Test**: launch the app with a funded account; the Home screen
shows identity, total balance, 24h change, and the asset list in the new layout.

**Acceptance Scenarios**:

1. **Given** an unlocked wallet with balances, **When** Home renders, **Then**
   the header shows wallet thumb + name + short address on the left and an
   avatar on the right; the balance block shows "Total balance", the amount,
   the 24h change and a "History" pill; assets render as cards below a
   "Portfolio | NFTs" sub-tab row.
2. **Given** Home is visible, **When** the user taps the eye toggle, **Then**
   the balance and every per-asset amount are masked, and the choice persists
   across sessions as it does today.
3. **Given** the account is watch-only, **When** Home renders, **Then** the
   Send action is disabled and Receive still works.

---

### User Story 2 - Move between chains and sub-tabs without losing the balance (Priority: P1)

The balance block swipes horizontally between chains (Solana ↔ Bitcoin) with
page dots and a "→ BTC" hint. Sub-tabs "Portfolio | NFTs" switch the content
below. On Portfolio the balance stays pinned while the list scrolls; on NFTs
the balance scrolls away with the content.

**Why this priority**: it is the core navigation model that replaces the
bottom tab bar.

**Independent Test**: swipe the balance, tap the dots, switch sub-tabs, scroll
each sub-tab.

**Acceptance Scenarios**:

1. **Given** two chains, **When** the user swipes the balance block or taps a
   dot, **Then** the balance, change, and asset list switch to that chain with
   the existing chain-switch animation.
2. **Given** the Portfolio sub-tab, **When** the asset list scrolls, **Then**
   the balance block and sub-tab row stay fixed above it.
3. **Given** the NFTs sub-tab, **When** the content scrolls, **Then** the
   balance block scrolls away with it and the sub-tab row remains reachable
   (sticky) so the user can switch back without scrolling to the top.
4. **Given** the balance is on Bitcoin, **When** the user switches to the NFTs
   sub-tab, **Then** the balance block animates back to Solana automatically
   (NFTs exist only there); the sub-tab row itself is always visible
   regardless of chain.
5. **Given** the balance is on Bitcoin and the Portfolio sub-tab, **When** the
   list renders, **Then** it shows the Bitcoin content exactly as today (price
   chart, market data, about) — Bitcoin has no asset-detail screen.

---

### User Story 3 - Reach actions and settings from Home (Priority: P2)

Send and Receive are two circular actions next to the balance; "History" opens
the transaction history; the avatar opens Settings; the wallet identity opens
the wallet switcher; a floating `+` opens the Powerups launcher.

**Why this priority**: replaces the entry points the removed tab bar provided.

**Independent Test**: tap each entry point and confirm the right surface opens.

**Acceptance Scenarios**:

1. **Given** Home, **When** the user taps Send / Receive / History, **Then**
   the existing send, receive, and history sheets open (they stay sheets in
   this feature).
2. **Given** Home, **When** the user taps the avatar, **Then** Settings opens;
   **When** the user taps the wallet identity, **Then** the wallet switcher
   opens.
3. **Given** Home, **When** the user taps `+`, **Then** a Powerups launcher
   sheet opens (this feature ships it with a heading, an "Installed" section
   placeholder, and a "Browse Powerups" row; the catalogue is a later feature).

---

### User Story 4 - A consistent component kit for every later screen (Priority: P2)

Designers and developers get one set of reusable pieces — card, key/value row,
list row, icon bubble, chip/chip group, section label, powerup badge, screen
header, buttons, bottom sheet — with a single roundness/padding/type scale, so
the remaining screens are compositions rather than new styling.

**Why this priority**: the later slices depend on it; building screens without
it reintroduces drift.

**Independent Test**: each primitive has its own unit test and renders with the
documented variants; Home and the Powerups sheet are built only from them.

**Acceptance Scenarios**:

1. **Given** the kit, **When** a screen needs a surfaced block, **Then** it uses
   the card primitive with one of the documented tones/paddings instead of
   ad-hoc styles.
2. **Given** the kit, **When** a Powerup is shown, **Then** its tier badge
   (Official / Community / Featured) comes from the badge primitive.

---

### Edge Cases

- Only one chain available (e.g. developer networks off): no dots or "→ BTC"
  hint; swipe does nothing.
- Balance failed to load partially: the existing warning banner still shows;
  the layout does not jump.
- Very long wallet names or large balances: text truncates/shrinks; the action
  circles never wrap or shrink.
- Small phones (≈320 pt wide) and large phones/tablets: layout scales; nothing
  overflows horizontally.
- Reduced motion enabled: chain switch and sink/float transitions respect it as
  today.
- Task engaged (send/swap flow takes the screen): Home content sinks and floats
  back exactly as before; the FAB sinks with it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Home MUST render header (identity + avatar), balance block,
  sub-tab row, content area, and a floating `+` action, matching the
  CORE 01 structure and the deep-water aesthetic.
- **FR-002**: The bottom tab bar MUST be removed; its files deleted.
- **FR-003**: Sub-tabs MUST be "Portfolio" and "NFTs" (no DeFi). Both labels
  MUST exist in English and Spanish.
- **FR-004**: The balance block MUST swipe between chains, expose page dots and
  a next-chain hint, and keep the existing 24h change semantics.
- **FR-005**: On Portfolio the balance block and sub-tab row MUST stay pinned;
  on NFTs they MUST scroll with content, with the sub-tab row sticky.
- **FR-006**: Switching to a sub-tab whose content is chain-specific (NFTs)
  while on another chain MUST animate the balance back to Solana.
- **FR-007**: Bitcoin MUST keep its current in-Portfolio content and MUST NOT
  gain an asset-detail screen.
- **FR-008**: Send/Receive/History/Settings/Wallet-switcher entry points MUST
  keep working and keep their existing automation identifiers where the
  element survives.
- **FR-009**: The `+` action MUST open a Powerups launcher sheet stub.
- **FR-010**: Marine snow MUST be removed from the mobile water column; the
  loading screen and depth gradient stay. (Web/extension snow is out of scope.)
- **FR-011**: The derived-account (sub-account) chips MUST leave Home; they
  return inside the wallet switcher in a later feature.
- **FR-012**: The following primitives MUST exist with unit tests: Card,
  KeyValueRow, ListRow, IconBubble, Chip + ChipGroup, SectionLabel,
  PowerupBadge; ScreenHeader, buttons and bottom sheet MUST be restyled to
  the same scale without changing their public props.
- **FR-013**: Powerup badges MUST use the three tiers Official / Community /
  Featured as drawn in `product.pen`.
- **FR-014**: Salmon-filled buttons and actions MUST keep the flesh texture;
  the existing loading screen MUST remain unchanged.
- **FR-015**: Replaced components (balance card, action button row) MUST be
  deleted once nothing imports them.
- **FR-016**: `DESIGN.md` MUST be updated for: two modes (deep-water first),
  marine snow retired, navigation without a tab bar, plain balance block.
- **FR-017**: Every new visible string MUST exist in English and Spanish.

### Key Entities

- **Chain balance**: chain id, total in fiat, 24h change, loading state.
- **Sub-tab**: key (portfolio | nfts | future powerup), label, whether it is
  chain-specific and which chain.
- **Powerup tier**: official | community | featured.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can read wallet name, total balance and 24h change within
  one screen, no scrolling, on a 390×844 and a 320-wide device.
- **SC-002**: Switching chain or sub-tab completes its animation in under
  400 ms and never shows an empty balance frame.
- **SC-003**: 100% of existing Home automation flows (Maestro smoke) pass
  after re-pointing the removed tab selectors.
- **SC-004**: Every primitive has ≥1 unit test; mobile unit suite stays green.
- **SC-005**: Zero hard-coded colour/radius/padding values in the new
  components (all from theme tokens).
- **SC-006**: No user-visible English-only strings (i18n audit clean).

## Assumptions

- The 24h change is what the data provides; the design's "this week" copy is
  not backed by data and is not built.
- The balance number uses the display type size (36) rather than the 60-pt
  hero size, so it fits beside the two action circles.
- Powerup tiers follow `product.pen` (Official / Community / Featured) as the
  owner decided on 2026-09-01, superseding the earlier custody/data-exposure
  classification note.
- Shared marine-snow geometry stays in the shared package until the
  web/extension redesign removes it there.
- `SubAccountSelector` files stay in the repo (unused) until the wallet
  switcher feature reuses them.
