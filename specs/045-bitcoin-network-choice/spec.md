# Feature Specification: Choose and manage Bitcoin support — "Solana + Bitcoin" or "Solana only"

**Feature Branch**: `feat/045-bitcoin-network-choice`

**Created**: 2026-11-25

**Status**: Clarified — every open question answered by the owner on 2026-11-25

**Input**: Linear DEV-204 "Choose and manage Bitcoin support". Goal: each user decides which networks they use in Salmon Wallet. Onboarding offers two clear options, "Solana + Bitcoin" or "Solana only"; the choice persists and decides whether Bitcoin features and screens appear in the app. Settings gets a control to enable or disable Bitcoin after onboarding. Acceptance: onboarding lets the user choose; the choice is saved; with Bitcoin disabled, Bitcoin navigation and features are not shown; with it enabled, all of them are available; the user can change it in Settings at any time and the change applies and persists; enabling or disabling Bitcoin does not affect Solana accounts, funds or features; disabling Bitcoin deletes or loses no existing wallet information; the behaviour is consistent on desktop (extension) and mobile.

## Why this exists

Salmon is Solana-first, and most of its users never touch Bitcoin. Today every wallet made from a recovery phrase shows Bitcoin anyway: Home's balance block offers a "Solana | Bitcoin" switch, and every screen that follows the chosen chain (Receive, Send, Activity, the wallets list, the private key screen, the derived-account search) can land on Bitcoin. For a Solana-only user that is one more thing to understand and one more way to send funds to the wrong network.

This feature lets the user say which networks they want. "Solana only" removes Bitcoin from every screen; "Solana + Bitcoin" keeps the app as it is today. The choice is a view, never a deletion: the recovery phrase controls the same Bitcoin address whether Bitcoin is shown or not, so turning Bitcoin back on brings back the same address and the same balance. A self-custodial wallet must never make funds look gone without saying so, which is why turning Bitcoin off is explained before it happens.

## What exists today

These facts shape the requirements below.

- **Bitcoin is on for everyone.** The wallet offers Bitcoin whenever the Salmon backend's network list has it enabled. There is no user setting for it.
- **A phrase wallet holds a Bitcoin address from the start.** Creating or recovering a wallet from a recovery phrase sets up a Solana address and a Bitcoin address (plus the test-network twin of each, for Developer Networks) in the same step, and every unlock rebuilds them from the phrase.
- **Four kinds of wallet hold no Bitcoin at all.** A wallet imported from a private key, a watch-only address, and a Seed Vault wallet (Solana Seeker phones) hold one Solana address each. For them, Home already shows no chain switch and nothing Bitcoin: that screen is what "Solana only" looks like.
- **Every chain-dependent screen follows the chain the user is standing on.** Receive, Send, Activity, the wallets list and its totals, the token pages and the explorer choice all read the chain currently selected on Home. Remove Bitcoin from the list of chains offered and these screens stop reaching it.
- **Totals never mix chains.** The total on Home and the totals on the Wallets screen are for the chain on screen. A Bitcoin balance has never counted in a Solana total, so hiding Bitcoin changes no Solana figure.
- **Everything else is Solana-only already.** dApp connections, Swap, Solana Pay, Payments, Memo and the other Powerups act only on Solana. The app's own links open no Bitcoin screen.
- **Comparable settings are per device.** Developer Networks, "Show unverified tokens" and the token list choice (spec 044) live in one settings record on the device and apply to every wallet in that app. The same record also keeps a few per-wallet facts, keyed by wallet (which wallets count in the Wallets total).
- **Precedent for switching a chain off under the user.** Turning Developer Networks off while standing on a test network first moves the session to that network's main network, so the session is never left on a page nobody can reach.

## Clarifications

### Session 2026-11-25

The owner accepted the recommended default of every open question.

- Q: One choice for the whole app, or one per wallet? → A: One for the whole app on that device, like Developer Networks, unverified tokens and the token list; the Settings switch then means one thing.
- Q: Which setups ask the question? → A: Create and recover from a recovery phrase only. Seed Vault setup (those wallets are Solana only), private-key import and watch-only import do not ask; the choice stays as it is.
- Q: Warn before hiding Bitcoin always, or only when the wallet holds Bitcoin? → A: Always, a short confirmation; no balance lookup, so it can never be wrong.
- Q: What do users who set up before this feature get? → A: Bitcoin stays on and nobody is asked; hiding it on an update would make funds look gone.
- Q: Where does the question sit in setup? → A: Right before the password screen, after the phrase is shown (create) or entered (recover).
- Q: Exact copy? → A: Title "Choose your networks"; options "Solana + Bitcoin" — "Use Solana and Bitcoin in one wallet." and "Solana only" — "Just Solana. You can add Bitcoin later in Settings."; Spanish "Elegí tus redes", "Solana + Bitcoin" — "Usá Solana y Bitcoin en una sola wallet.", "Solo Solana" — "Solo Solana. Podés sumar Bitcoin después en Configuración." (voseo, like the rest of the Spanish copy). The owner edits wording in the pull request.
- Q: Where does the Settings switch sit? → A: Last row of Preferences, labelled "Bitcoin", description "Show Bitcoin in your wallet".
- Q: Does the derived-account search look on Bitcoin while it is off? → A: No, Solana only; a path funded only on Bitcoin is found once Bitcoin is on and the search runs again.
- Q: Are Bitcoin contacts listed in the address book while Bitcoin is off? → A: Hidden, never deleted; they return when Bitcoin is turned on.
- Q: Is the onboarding answer reported to analytics? → A: No; preferences report nothing and the consent copy lists what is sent.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Choose the networks when setting up (Priority: P1)

A new user creates a wallet. Before the wallet opens, a screen asks which networks they want, with two options of equal weight: "Solana + Bitcoin" and "Solana only", each with one plain line saying what it means. They pick "Solana only". Home opens with the Solana balance and no chain switch; nothing in the app mentions Bitcoin.

**Why this priority**: it is the heart of the request; without it every new user inherits Bitcoin.

**Independent Test**: on a fresh install, create a wallet and pick "Solana only"; Home shows no chain switch, and Receive, Send and Activity offer Solana only. Repeat with "Solana + Bitcoin"; Home shows "Solana | Bitcoin" as today.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the user creates a wallet, **Then** the setup asks "Solana + Bitcoin" or "Solana only" before the wallet opens, and the user cannot continue without picking one.
2. **Given** the user picked "Solana only", **When** Home opens, **Then** the balance block shows Solana with no chain switch, and no screen offers Bitcoin.
3. **Given** the user picked "Solana + Bitcoin", **When** Home opens, **Then** the app behaves exactly as it does today, Bitcoin included.
4. **Given** the user picked either option, **When** the app is closed and opened again, **Then** the choice is still in force.
5. **Given** the user recovers a wallet from a recovery phrase, **When** the setup reaches the same point, **Then** it asks the same question.
6. **Given** a fresh install, **When** the user sets up with a Seed Vault (Seeker phone), imports a private key or watches an address, **Then** the setup does not ask, and Bitcoin stays on (those wallets show no Bitcoin anyway; the Settings switch can still turn it off).

---

### User Story 2 - Turn Bitcoin on or off in Settings (Priority: P1)

A user who chose "Solana only" later wants to receive Bitcoin. In Settings they turn on the "Bitcoin" switch. Home's balance block shows "Solana | Bitcoin" again, with the same Bitcoin address and balance the phrase has always controlled. Weeks later they turn it off again; the app explains that their Bitcoin stays theirs and only stops being shown, and Bitcoin leaves every screen.

**Why this priority**: the choice must be reversible, or onboarding becomes a trap.

**Independent Test**: on a phrase wallet whose Bitcoin address holds a balance, turn Bitcoin off; Bitcoin disappears from Home and every other screen, Solana balances are unchanged. Turn it back on; the same Bitcoin address shows the same balance.

**Acceptance Scenarios**:

1. **Given** Bitcoin is off, **When** the user turns the switch on, **Then** Home offers Bitcoin right away, without a restart, showing the address the recovery phrase controls and its balance.
2. **Given** Bitcoin is on, **When** the user turns the switch off, **Then** the app always first states that Bitcoin funds stay in the wallet and come back when Bitcoin is turned on again, whatever the wallet holds, and Bitcoin leaves every screen once the user confirms.
3. **Given** the user turned the switch either way, **When** the app is closed and opened again, **Then** the switch is where they left it.
4. **Given** the user changes another setting (Developer Networks, "Show unverified tokens", the token list), **When** the app is opened again, **Then** the Bitcoin choice is unchanged, and changing the Bitcoin choice changes no other setting.

---

### User Story 3 - Solana is untouched (Priority: P1)

Whatever the user does with the Bitcoin switch, their Solana side is exactly as before: the same wallets, addresses, balances, tokens, staking, NFTs, connected sites, contacts and Powerups.

**Why this priority**: the request names it as an acceptance criterion, and a wallet that loses track of funds when a display setting changes has failed at its one job.

**Independent Test**: record every Solana balance, token, staked position, connected site and Powerup on a wallet; turn Bitcoin off, then on; every recorded item is identical at each step.

**Acceptance Scenarios**:

1. **Given** any Solana state, **When** Bitcoin is turned off or on, **Then** every Solana address, balance, token, staked position, NFT, connected site, contact and installed Powerup is unchanged.
2. **Given** a wallet, **When** Bitcoin is turned off, **Then** no wallet, address, contact, setting or stored record is deleted; turning Bitcoin on shows everything Bitcoin-related it showed before.

---

### User Story 4 - The session is never stranded on Bitcoin (Priority: P2)

A user is looking at their Bitcoin balance and turns Bitcoin off from Settings. When they go back to Home, it stands on Solana.

**Why this priority**: a session left on a chain the app no longer offers shows a page nobody can reach; the Developer Networks switch already guards against the same failure.

**Independent Test**: select Bitcoin on Home, turn Bitcoin off in Settings, return to Home; Home shows the Solana main network.

**Acceptance Scenarios**:

1. **Given** the session stands on Bitcoin or the Bitcoin test network, **When** Bitcoin is turned off, **Then** the session moves to the Solana main network before Bitcoin stops being offered.
2. **Given** the session stands on Bitcoin and the app is closed, **When** it reopens with Bitcoin off (for example, after the change was made on another window of the extension), **Then** Home opens on the Solana main network.

---

### User Story 5 - Existing users see no change (Priority: P2)

A user who set up Salmon before this feature updates the app. Nothing changes for them: Bitcoin is still there, and the new Settings switch is on.

**Why this priority**: an update that silently hides a chain someone holds funds on is the failure this feature must not cause.

**Independent Test**: update an install that has a phrase wallet; Home still offers Bitcoin and the Settings switch reads on.

**Acceptance Scenarios**:

1. **Given** an install set up before this feature, **When** the user opens the updated app, **Then** Bitcoin stays on, nothing asks the onboarding question, and the Settings switch is on.

---

### User Story 6 - Same behaviour on both apps (Priority: P2)

The onboarding question and the Settings switch look and behave the same on the extension and on mobile: same place, same words, same effect.

**Why this priority**: the two apps are twins by rule (one contract, two renderings); each is useful on its own.

**Independent Test**: run User Stories 1 and 2 on each app; each step reads and behaves the same.

**Acceptance Scenarios**:

1. **Given** either app, **When** the user goes through setup, **Then** the network question appears at the same step with the same copy.
2. **Given** either app, **When** the user opens Settings, **Then** the Bitcoin switch sits in the same group and row position with the same label and description.

### Edge Cases

- **Wallets that hold no Bitcoin.** A private-key, watch-only or Seed Vault wallet shows no Bitcoin whatever the switch says, as today. Turning Bitcoin on with such a wallet active changes nothing on its Home; switching to a phrase wallet then shows Bitcoin.
- **Adding a second wallet.** Adding a wallet from the wallet switcher (create, recover, import key, watch address, Seed Vault) does not ask the question again; the current choice applies.
- **Removing every wallet.** "Remove all wallets" leads back to the welcome screen, and setting up again asks the question again; the new answer replaces the old one.
- **Bitcoin test network.** Turning Bitcoin off also hides the Bitcoin test network that Developer Networks offers. Turning Developer Networks on does not bring Bitcoin back.
- **Bitcoin funds while hidden.** Bitcoin received while hidden still arrives on chain; it shows when Bitcoin is turned on again. The wallet makes no Bitcoin balance or history lookups while Bitcoin is off.
- **Scanning or pasting a Bitcoin address.** With Bitcoin off, scanning or pasting a Bitcoin address on Solana gets the same "This address belongs to a different network" message it gets today on Solana.
- **Address book.** Contacts saved on Bitcoin are kept. While Bitcoin is off they are not listed; they return when Bitcoin is turned on.
- **Private key screen.** While Bitcoin is off, the private key screen lists Solana only; the Bitcoin key is still controlled by the recovery phrase and shows again when Bitcoin is turned on.
- **Derived-account search.** While Bitcoin is off, "Check derivables" and the Wallets rescan look on Solana only.
- **Extension with several windows.** A change made in one window (popup, side panel) applies in the others the next time they read settings, at the latest when they are reopened.
- **Backend turns Bitcoin off.** If the Salmon backend disables Bitcoin for everyone, Bitcoin is not shown whatever the user chose, as today. The user's choice only ever hides Bitcoin; it never shows a network the backend disabled.
- **Network outage during setup.** Picking an option makes no network request, so an offline device can still answer the question.

## Requirements _(mandatory)_

### Functional Requirements

**The choice**

- **FR-001**: The app MUST keep one Bitcoin choice with two values, on ("Solana + Bitcoin") and off ("Solana only"). The choice applies to the whole app on that device, to every wallet in it, never per wallet.
- **FR-002**: The choice MUST persist across restarts and app updates, on both apps.
- **FR-003**: An install set up before this feature MUST read the choice as on and MUST NOT be asked the onboarding question.
- **FR-004**: The choice MUST NOT be synced between devices; the extension and the phone are set separately, like every other setting.

**Onboarding**

- **FR-005**: When a wallet is created or recovered from a recovery phrase during first setup, and only then, the setup MUST ask "Solana + Bitcoin" or "Solana only", MUST NOT continue until one is picked, and MUST save the answer before the wallet opens. Seed Vault setup, private-key import and watch-only import MUST NOT ask; they leave the choice as it is (on for a fresh install).
- **FR-006**: The screen is titled "Choose your networks" ("Elegí tus redes"). The two options, "Solana + Bitcoin" — "Use Solana and Bitcoin in one wallet." and "Solana only" — "Just Solana. You can add Bitcoin later in Settings." ("Solana + Bitcoin" — "Usá Solana y Bitcoin en una sola wallet.", "Solo Solana" — "Solo Solana. Podés sumar Bitcoin después en Configuración."), MUST be presented with equal weight. Neither option is preselected.
- **FR-007**: The question MUST appear at the same step on both apps: right before the password screen, after the phrase is shown (create) or entered (recover).
- **FR-008**: Adding another wallet after setup MUST NOT ask the question.
- **FR-009**: Setting up again after "Remove all wallets" MUST ask the question again and save the new answer.

**Settings**

- **FR-010**: Settings MUST show a switch labelled "Bitcoin" with the description "Show Bitcoin in your wallet", as the last row of Preferences on both apps, reading on or off as the choice is.
- **FR-011**: Turning the switch on MUST make Bitcoin available on Home and every screen that follows the selected chain, immediately and without a restart.
- **FR-012**: Turning the switch off MUST always first tell the user, in plain words, that Bitcoin funds stay in the wallet and return when Bitcoin is turned on again, and MUST apply only once the user confirms; cancelling leaves the switch on. The confirmation makes no balance lookup.
- **FR-013**: Changing the Bitcoin switch MUST NOT change any other setting, and changing any other setting MUST NOT change the Bitcoin switch.

**With Bitcoin off**

- **FR-014**: Home MUST NOT offer Bitcoin or the Bitcoin test network; with only one main network left, the balance block shows no chain switch, exactly as it does today for a wallet that holds Solana only.
- **FR-015**: No screen MUST let the user reach Bitcoin: Receive, Send, Activity, the Wallets screen and its totals, the network selector, the explorer choice, the private key screen, the address book and the derived-account search all show Solana only.
- **FR-016**: If the session stands on Bitcoin when the switch is turned off, or when the app opens with Bitcoin off, the session MUST move to the Solana main network.
- **FR-017**: The wallet MUST NOT request Bitcoin balances, Bitcoin activity or Bitcoin market data while Bitcoin is off.

**Safety**

- **FR-018**: Turning Bitcoin off or on MUST NOT add, remove or alter any wallet, address, contact, connected site, Powerup, setting or stored record other than the Bitcoin choice itself.
- **FR-019**: With Bitcoin turned back on, the wallet MUST show the same Bitcoin address the recovery phrase has always controlled, with its current balance, and every Bitcoin contact and setting it showed before.
- **FR-020**: Every Solana address, balance, token, staked position, NFT, total, connected site and Powerup MUST be identical with Bitcoin on and off.

**Both apps**

- **FR-021**: Both apps MUST read the choice from one shared definition and apply one shared rule for which networks are offered, so the two apps can never disagree on whether Bitcoin is shown.
- **FR-022**: Every new user-facing string MUST exist in English and Spanish; the Spanish copy is written by the implementer and reviewed by the owner in the pull request, as in specs 043 and 044.
- **FR-023**: The onboarding screen and the Settings switch MUST be built from components both apps already have (the onboarding layout and buttons, the Settings switch row used by Developer Networks); any new piece of UI is signed off by the owner before it is built.
- **FR-024**: Neither the onboarding answer nor changing the switch in Settings MUST report anything to analytics, like every other preference.

### Key Entities

- **Bitcoin choice**: whether the user wants Bitcoin shown — on ("Solana + Bitcoin") or off ("Solana only"). Set during first setup, changed in Settings. One per app install, shared by every wallet in it.
- **Offered networks**: the networks Home and the chain-dependent screens let the user reach. Today it is what the backend enables, narrowed by Developer Networks and by what the active wallet holds; this feature narrows it further by the Bitcoin choice.
- **Bitcoin address**: the address the recovery phrase controls on Bitcoin. It exists whether or not Bitcoin is shown; the choice only decides whether the app shows it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user who picks "Solana only" finds no Bitcoin on any screen of either app, verified by walking every screen listed in FR-015.
- **SC-002**: Answering the onboarding question adds one screen and one tap to setup.
- **SC-003**: For a fixed set of wallets, every Solana figure (balances, tokens, staking, totals) is identical with Bitcoin on, off, and on again.
- **SC-004**: A wallet whose Bitcoin address holds funds shows the same address and balance after Bitcoin is turned off and on again.
- **SC-005**: An install updated from the previous version shows Bitcoin exactly as before, with the switch on.
- **SC-006**: With Bitcoin off, a session of normal use (Home, Receive, Send, Activity, Wallets) makes zero Bitcoin requests.
- **SC-007**: Every gate the repository already runs (typecheck, lint, tests, DOM parity, i18n, dead code) stays green on both apps.

## Assumptions

- **Bitcoin addresses are still set up for every phrase wallet**, whatever the choice. Showing or hiding is a view over what the phrase already controls, so turning Bitcoin back on is instant and shows the same address, and nothing about how keys are derived or stored changes.
- **The backend's network list stays the outer limit.** The choice can hide Bitcoin; it never shows a network the backend disabled.
- **No backend change.** The choice lives on the device and filters what the app asks for.
- **JS-only.** Nothing reaches native configuration: mobile receives it over the air, the extension in its next store build.
- **Existing e2e flows change.** Mobile and extension setup flows gain one step, and the flows that switch to Bitcoin need Bitcoin on.
- **Out of scope**: choosing networks other than Bitcoin (Ethereum stays unshown scaffolding), deleting Bitcoin addresses, hiding individual Home tabs (DEV-215 covers "hide a surface by preference" for the Portfolio and NFTs tabs; the two features should read alike but are built separately), and moving Bitcoin funds before hiding them.
