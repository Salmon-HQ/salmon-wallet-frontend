# Feature Specification: Gate removal + Settings and Wallets screens

**Feature Branch**: `feat/redesign-mobile-home` (continues 015 on the same branch; spec dir `016-settings-wallets-screens`)

**Created**: 2026-09-01

**Status**: Draft

**Input**: Owner: "toda referencia, sea componente o movimiento, a la compuerta que antes teníamos, que se vaya; andá creando las screens para settings y para wallet selection; al agregar una wallet desde el selector debe mandarme a la misma que se llega desde settings".

Depends on: `specs/015-mobile-home-shell` (Home shell, primitive kit, sheet-vs-screen state rule in `DESIGN.md` §Sheets). Structural source: `product.pen` CORE 10 · Wallet switcher; CORE 11 · Settings is not drawn yet — Settings keeps today's information architecture, restyled with the kit.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The header is just a header (Priority: P1)

The top row (profile picture, wallet name + short address, gear) sits on the same plane as the balance and never lifts, slides, or reveals a panel from behind. When a task takes the screen, the header fades/sinks with the content and returns with it. Nothing in the app moves "from the bottom up" to cover it.

**Independent Test**: launch, unlock, open Send, cancel; watch the header.

**Acceptance Scenarios**:

1. **Given** Home, **When** any surface opens (Send, Receive, Powerups, Settings, Wallets), **Then** the header does not translate vertically and no panel unfolds from behind it.
2. **Given** a task is engaged, **When** it starts and ends, **Then** the header uses the same sink/float beat as the content.
3. **Given** the wallet is locked, **When** the lock screen shows, **Then** it fully covers Home and blocks touches exactly as today (unchanged).

---

### User Story 2 - Settings is a screen (Priority: P1)

Tapping the gear pushes a Settings screen with the current sections (Account: Accounts, Profile picture, Security, Backup, Private key; Preferences: Language, Currency, Explorer; Advanced: Address book, Trusted apps, Network, Analytics, Developer; About, Support; Remove wallet / Remove all). Each entry pushes its own sub-screen with a back well; selectors (language, currency, explorer) may stay as sheets (one state).

**Independent Test**: gear → every entry → back.

**Acceptance Scenarios**:

1. **Given** Home, **When** the gear is tapped, **Then** a Settings screen pushes with `ScreenHeader` (back + title), screen padding, and rows built from the kit (`Card` + `ListRow`).
2. **Given** Settings, **When** an entry is tapped, **Then** its sub-screen pushes; back returns to Settings; system back gesture works.
3. **Given** a sub-screen that reveals secrets (Backup, Private key), **Then** `useSecretScreen` protection is unchanged.

---

### User Story 3 - Wallets is a screen (CORE 10) (Priority: P1)

Tapping the profile picture / name pushes a Wallets screen: title "Wallets", subtitle, an aggregated-balance card (ink) with eye toggle and "N of M wallets included", an "Include in total" heading, one card per wallet (icon, name + inline rename action, balance, include checkmark; the active wallet outlined in accent), and an "Add wallet" outlined action.

**Independent Test**: tap identity → Wallets → select another wallet → back to Home shows it.

**Acceptance Scenarios**:

1. **Given** Wallets, **When** a wallet card is tapped, **Then** it becomes active and the screen pops back to Home with that wallet.
2. **Given** Wallets, **When** the include checkmark is toggled, **Then** the aggregated balance and the "N of M" line update; the choice persists.
3. **Given** Wallets, **When** "Add wallet" is tapped, **Then** the SAME add-wallet flow that Settings → Accounts → Add opens (one implementation, two entry points); on completion the user lands back on Wallets with the new wallet active.
4. **Given** Wallets, **When** the rename action is tapped, **Then** the same rename flow as Settings → Accounts → Edit opens.
5. Derived-account (path index) selection, removed from Home in 015, lives here per wallet.

---

### Edge Cases

- One wallet only: no "N of M" ambiguity; include toggle still shown but cannot exclude the last included wallet (aggregated total never empty).
- Watch-only wallets appear with their badge; excluded from nothing by default.
- Balance hidden (eye): aggregated and per-wallet balances mask; a11y labels mask too.
- Very long wallet names truncate; rename action stays reachable.

## Requirements _(mandatory)_

- **FR-001**: Every remnant of the gate MUST be removed: the `GateContainer` component (except what the lock screen needs, which moves to a lock-only container), its lift/conceal choreography, `GateState`/`GateExpandedHeader` types, `PanelHost` mounting of Settings/Wallets as gate panels, `TaskChrome` hooks that exist only for the gate, related tests and DESIGN.md prose that still describes it as live.
- **FR-002**: Settings MUST be a stack screen with sub-screens; existing panel components are reused as screen bodies (restyled with the kit), not rewritten; the shared `SettingsScreen` union stays the navigation vocabulary.
- **FR-003**: Wallets MUST be a stack screen matching CORE 10; wallet selection, rename, add and derived-account selection reuse the existing account actions/panels.
- **FR-004**: "Add wallet" from Wallets and from Settings MUST route to one shared screen.
- **FR-005**: Aggregated balance = sum of included wallets' fiat totals; inclusion persists per wallet; at least one wallet always included.
- **FR-006**: The lock screen coverage and touch blocking MUST remain intact and tested.
- **FR-007**: All copy EN + ES; testIDs for every new pressable per `e2e-test-labels`.
- **FR-008**: `SettingsSheet`, `WalletSwitcherSheet`, `SubAccountSelector` files are deleted once their bodies are migrated (owner rule: delete parent files).

## Success Criteria _(mandatory)_

- **SC-001**: Zero occurrences of gate vocabulary (`GateContainer`, `compuerta`, `concealed`, `GateExpandedHeader`) in `apps/mobile` outside the lock container.
- **SC-002**: Settings, every sub-screen, and Wallets reachable and back-navigable; Maestro smoke updated.
- **SC-003**: Unit suite green; new tests for aggregated balance math, inclusion persistence, add-wallet shared route, lock coverage.

## Assumptions

- CORE 11 is undrawn; Settings uses today's IA and the kit's styling, to be adjusted when the `.pen` lands.
- Language/currency/explorer pickers stay sheets (single pick).
- The aggregated-balance inclusion flag is new state stored with user config (`useUserConfig`), mobile-first; the shared contract may gain an optional field.
