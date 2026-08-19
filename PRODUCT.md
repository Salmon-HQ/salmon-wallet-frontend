# Product

<!-- impeccable:product-schema 1 -->

Durable product truth for Salmon Wallet. This file records what the product is, who it is for, what platforms it runs on, and which constraints bind design. It contains no visual specification — that is `DESIGN.md`'s job.

Sources: the company knowledge base (SOT vault) and this repository. Claims are labelled where their status matters: **[stated]** for what the knowledge base says in its own words, **[asserted]** for strategic claims with no observed evidence behind them, **[open]** for decisions a human still has to make.

## Platform

adaptive

Three shipped surfaces from one monorepo:

| Surface | Form | Notes |
| --- | --- | --- |
| iOS | React Native / Expo app | In App Store review at the time of writing; one Guideline 2.1 rejection recorded (v1.0.3, first review round) |
| Android | React Native / Expo app | Live, labelled Beta |
| Browser extension | Chrome (MV3) and Firefox, built with WXT | Opens as a **side panel** |
| Web | Browser app, served at `v2.salmonwallet.io` | Despite the repo being named v3, "v2" is the current production web wallet |

`adaptive`, not `web`: the same business logic ships to a native runtime and to two browser runtimes, and each is expected to respect its own platform conventions rather than render one design language everywhere.

**The extension is a side panel, not a popup.** Chrome uses `chrome.sidePanel.setPanelBehavior`, Firefox uses `sidebarAction.toggle()`. That means full viewport height and a user-resizable width, not a fixed 360×600 popup. Any reasoning that starts from "it's a 360px popup" is reasoning about a surface this product does not have. A narrow column is still the governing width case; a short one is not.

## Users

**No user research exists.** The knowledge base contains no personas, no interviews, no surveys, no support-ticket analysis, and no churn analysis. Every audience statement below is a strategic assertion by the team, not an observed fact. Design decisions that lean on these should say so.

Stated target, and stated non-target [stated]:

> "Salmon is not trying to be the easiest wallet for every casual user on day one."

Named first-target segments [asserted]:

- Crypto-native users who care about self-custody and transparency
- Solana users who want a wallet aligned with the ecosystem
- Builders and integrators who need open wallet infrastructure
- Contributors who want the wallet layer inspectable and extensible
- Communities that do not want their access layer controlled by a closed company

The strategy behind the segment [stated]: "Salmon is not targeting the broadest wallet market first … Strategic density matters more than raw user count."

Sophistication is assumed high. The store copy names the audience as active Solana users, builders, contributors, integrators, early adopters, and community members.

## Product Purpose

An open-source, self-custodial, Solana-first crypto wallet, with Bitcoin shipped alongside it and Ethereum reachable today only as a bridge destination.

The stated purpose [stated]:

> "Salmon exists to make the wallet layer more open, verifiable, and aligned with the people who depend on it."

> "Most wallets solve custody, but not control. Users may hold their keys while still depending on closed companies for integrations, defaults, roadmap decisions, monetization, and product evolution. Salmon is built against that pattern."

Success is framed as longevity, not growth: "Salmon prioritizes longevity over growth" and "If Salmon fails, it should fail in public."

## Positioning

Public one-liner: **"Open code. Open ownership."** Site title tag: "Salmon Wallet — Open Wallet Infrastructure".

The claim a competitor could not truthfully copy is verifiability, not features: open source under Apache-2.0, a public repository listed as a product surface, and an actively operated Solana validator used as an ecosystem-alignment signal. The competitive foil, named directly in the knowledge base, is closed-source incumbent Solana wallets (Phantom is named).

Two positioning cautions the product must respect:

- Salmon is **audit-ready, not audited**. The vision forbids inflated security claims. No "Audited" badge, no certification-implying shield, exists or may be invented.
- The vision says "Salmon should not market infrastructure that does not exist yet as if it were already finished", while the live site already uses "Open Wallet Infrastructure" as its title. That tension is recorded, not resolved.

## Operating Context

- **Self-custody.** Keys are encrypted on device, protected by a user password. Losing the recovery phrase is unrecoverable, and the site says so publicly.
- **Approval is the product's centre of gravity.** Every sensitive action must explain what will happen, what can go wrong, what it costs, and what is being approved.
- **Off-chain message signing (OCMS)** is shipped — a Solana Foundation standard, with Salmon listed as an early adopter. A v1 OCMS message begins with `0xff` plus the literal domain `"solana offchain"`, which can never begin a valid transaction, closing the transaction-lookalike blind-signing attack. Shipped on web v1.1.0 and extension 0.11.1/0.11.2. Mobile carries only the WebCrypto polyfill and has no dApp surface at all.
- **Mobile Wallet Adapter is Android-only, permanently.** iOS suspends backgrounded apps, which kills the socket MWA depends on. dApp connectivity is therefore an Android-and-extension capability, and the iOS build must present that absence as a platform reality rather than a missing or broken feature.
- **Third-party dependencies with user-visible failure modes**: Jupiter (same-chain swap), StealthEX (cross-chain bridge, non-KYC, third-party custody window with "no control, no cancel, and no recovery path"), Triton One (primary Solana RPC and DAS), Helius (RPC fallback), Blockdaemon/Ubiquity (Bitcoin). A Triton DAS outage surfaces as an *empty* NFT list, so "you have none" and "we couldn't load this" must be distinguishable states. **Enforced** (1981e8ee): the home token list and the collectibles views on all three platforms gate their empty state on the absence of a load error, and the error state carries an explicit retry — an outage may no longer masquerade as an empty wallet.

## Capabilities and Constraints

### Shipped

Solana and Bitcoin accounts (mainnet plus devnet/testnet), send, receive, swap (Jupiter), bridge (StealthEX, Solana ↔ Bitcoin ↔ Ethereum), NFTs/collectibles, a spam filter, OCMS and Sign-in-with-Solana on web and extension.

### Powerups — planned, not built

The flagship roadmap concept. A Powerup is an installable capability module. The load-bearing rule, quoted verbatim and identically in two places in the knowledge base:

> "Powerups can propose actions. Salmon core validates, explains, requests approval, signs, and broadcasts."

The three named first official Powerups are **Swap**, **Bridge**, and **Explore**. Swap and Bridge ship today as core tabs; the Powerups model retroactively reframes them as modules. Explore has no code equivalent. Announcement tagline: "A smaller core. A wallet that can do more."

Two tiers: **Official** (built and maintained by Salmon) and **Community** (external developers on a restricted SDK). "Community-built does not mean trusted by default."

Surfaces Powerups will require that do not exist today: a marketplace/directory, a detail page carrying roughly eleven trust signals at once (official/community, review status, security score, reliability score, rating, monthly active users, successful-action count, last-updated date, open-source status, builder identity, known risks), a permission review sheet, a Powerup manager, a changelog and re-consent flow with a three-way choice, and a report-abuse affordance. Lifecycle states: installed / not installed / enabled / disabled / update-available / update-pending-consent / revoked.

**[open]** The knowledge base asks verbatim: "Should Powerups appear as tabs, action cards, command palette actions, or contextual suggestions?" A human must decide the entry point. Also open: whether all users see the marketplace or it starts behind an advanced mode; the default install state for official Powerups; how security and reliability scores are visualized; whether Salmon supplies Powerup icons, a shape constraint, or accepts arbitrary builder art; and whether the concept is called "Powerups" or "Skills" — two names for one thing currently coexist and shipping both would be a defect.

### Other planned concepts

Open Wallet Infrastructure (a direction, not a shipped platform), Salmon Core and its five named primitives (Vault, Network, Builder, Parser, State — "Vault" is effectively a reserved word), the Integration Abstraction Layer ("the wallet asks for a capability, not a specific company", which means confirmation screens must stay provider-agnostic), an agent runtime, a CLI, seedless wallet, an MCP server, and a public SDK. Committed 12-month roadmap themes add watch mode, onboarding rework, portfolio view, and notifications — none of which have specs.

A **SALMON** token exists only as a "proposed ownership coin, not a live token". No token or governance UI exists, and none should be designed speculatively.

### Binding technical and product constraints

- **i18n.** Every user-facing string exists in English and Spanish and routes through `t('key.path')`. `pnpm check:i18n` enforces exact en/es parity in CI, in both the shared locales and the extension's `_locales`. **Spanish is voseo rioplatense** — Argentine/Uruguayan, not neutral LatAm. Translations are never guessed. Layouts must tolerate ~15–25% Spanish expansion. The website also ships Portuguese; the apps do not, and no document commits them to it.
- **Error handling is a contract.** Raw provider text never reaches users. Every external failure is classified into a translation key and rendered as localized, actionable copy; screens carry a render slot for the key, not for raw error text. Three feedback patterns exist to build on: inline errors with retry (never a fake success or a silent reset), `WarningNotice` banners, and a blocking `WalletInitErrorScreen`. dApp-facing errors over Wallet Standard are fixed English protocol strings and stay outside i18n.
- **Analytics consent is off by default** and its dialog is deliberately asymmetric: a single Accept CTA grants consent, and declining is the standard close affordance (the X), not a competing button. Eleven events, five allow-listed prop keys; payloads structurally cannot carry addresses, exact amounts, or anything seed-derived. This asymmetry is a decided pattern and must not be "fixed" into a two-button modal.
- **App Store constraints.** The app holds a 4+ age rating; an embedded browser would push it to 16+/17+ and was dropped for that reason. Only two system permission prompts exist — Camera (QR) and Face ID. "Settings → Remove All Accounts" is Salmon's formal answer to Apple's account-deletion requirement and is therefore compliance-load-bearing: it must not be renamed, buried, or merged into a generic reset.
- **No dark patterns, by written policy.** The non-goals forbid "a growth machine that optimizes distribution while weakening trust": no urgency timers, no pre-checked consent, no dismissal-hostile modals.
- **Theme tokens may need to be plain CSS custom properties**, not only JS objects, if Salmon-themed UI is ever rendered inside a third-party component library (the Blinks proposal themes Dialect via CSS variables). Cheap to guarantee now.

### Platform fees — resolved: both rates are disclosed

Salmon takes a **0.5% Jupiter swap referral** (server-side; the frontend has no referral logic at all) and a **0.4% StealthEX bridge partner fee** (`STEALTHEX_PARTNER_FEE` in `../salmon-api`, sent upstream as `partner_fee` and netted into the estimate StealthEX returns).

The manifesto promises "No hidden gatekeepers. No opaque control." The tension this section used to record — disclose the cut or keep it quiet — was **resolved in favour of disclosure**. Both review screens now name the rate: swap shows "Salmon fee" with the percentage the backend reports, and bridge shows the same row against `BRIDGE_PARTNER_FEE_PERCENT`, with the please-note copy stating that the estimate already has the fee deducted.

What is disclosed is the **rate**, not an amount, and that is a limitation rather than a choice: StealthEX returns only the net `estimated_amount`, so no fee amount reaches the frontend. Showing one would require the backend to echo `partner_fee` and the gross estimate, or to add an explicit fee field to `BridgeEstimateResponse`. No document justifies the specific rates; that remains unrecorded.

Resolved engineering note: the backend's `calculateFee` used to label non-SOL fee amounts as SOL (5×–50× off). Fixed in salmon-api `8989ced`, which denominates the swap order fee in the input token. It never affected the bridge, which does no fee arithmetic on either side.

## Brand Commitments

- **Name.** "Salmon" (short, preferred by the vision doc) and "Salmon Wallet" (formal). "Salmon Core" is capitalized as a product noun. GitHub org `Salmon-HQ`; domain `salmonwallet.io`.
- **Licence.** Apache-2.0, open source as a first principle: "Closed code creates hidden power at the wallet layer."
- **The metaphor.** The only recorded statement of what the fish means is a 2022 post:

  > "Why this fish? Because we think is awesome, good looking and it can change his size to transform itself"

  The stated meaning is **transformation and adaptability** — not swimming upstream, not struggle against a current. That reading is counterintuitive for a designer and it happens to be the exact shape of the Powerups thesis (a wallet that changes shape to fit the user).

  **Fish scales are never mentioned anywhere in the knowledge base.** There is no scale motif, no pattern rationale, no colour rationale, and no logo history. The seigaiha scales pattern in this repository therefore has no recorded provenance; `DESIGN.md` is where it acquires a rationale, and that rationale is a design decision rather than a recovered fact.

- **No brand book exists.** No logo file, no colour value, no typeface, no spacing scale, and no brand guideline document exists in the knowledge base. `packages/shared/src/theme` is the de facto brand, with no document behind it. A media kit exists only as an external URL (`salmonwallet.io/assets/salmonwallet-mediakit.zip`) and has not been retrieved; it is the most likely home of any missing assets.
- **Voice.** Documented only as an analysis of 781 historical tweets: builder-first, optimistic, direct, casual, short lines, confident but not corporate; emoji at the end of a line to reinforce, not to decorate. The website's voice is a different register entirely — austere and declarative ("Decentralization without transparency is theater."). **Resolved:** the in-product UI voice is **sober with dosed warmth** — a calm, direct base register with no emoji anywhere in product UI; austere at approval and danger moments (state consequences plainly: "this cannot be undone"); warmer at onboarding and empty states. Spanish is always voseo rioplatense. The Twitter register stays on social; the website register stays on the website.
- **Public promises the UI must not falsify**: "Your private keys are encrypted on your device and protected by your password." · "If you lose your recovery phrase, no one can recover it for you." · "Salmon is designed to minimize unnecessary data collection." · "Even if the original team disappears, the code remains accessible."

## Evidence on Hand

- **Real assets**: the shipped theme tokens in `packages/shared/src/theme`, the brand mark as vector path data in `theme/brand.ts`, the seigaiha `ScalesBackground` component in `packages/ui`, and the DM Sans / Geist Mono binaries in `packages/assets/src/fonts` (SIL OFL 1.1, cleared for embedding).
- **Real product docs**: OCMS overview and approval-UI notes, the Jupiter referral and StealthEX bridge specs, the frontend analytics/privacy model, and the frontend error-handling contract.
- **Absent, and not to be fabricated**: user research of any kind; personas; testimonials; usage or retention numbers; competitor teardowns; a Figma or any other design-file reference; specs for Explore, seedless wallet, watch mode, onboarding rework, portfolio view, or notifications; and the provenance of the `Bool`/`BoolSplashLogo` asset, which appears in the codebase and nowhere in the knowledge base.

## Product Principles

The binding list, in the company's own words:

1. **Open source is non-negotiable.** Closed code creates hidden power at the wallet layer.
2. **Custody stays with the user.** Private keys, seed phrases, raw signing primitives, and unrestricted signing authority stay outside Powerups, Skills, agents, and third-party integrations.
3. **Security is a process, not a claim.** Avoid inflated security claims.
4. **Modularity beats bloat.** The base wallet stays focused; advanced workflows are optional, permissioned, reviewable, and removable.
5. **Users need clarity before approval.** Every sensitive action explains what will happen, what can go wrong, what it costs, and what is being approved.

What Salmon must not become: a closed wallet with open-source marketing; a feature-bloated wallet; a custodial shortcut disguised as better UX; a black-box agent that can move funds without clear approval; a growth machine that optimizes distribution while weakening trust; a public narrative that promises more than the product supports.

## Accessibility & Inclusion

**No accessibility commitment has ever been recorded.** The knowledge base contains no WCAG reference, no contrast requirement, no screen-reader policy, no dark-mode statement, and no a11y-label convention.

The design system nonetheless enforces **WCAG 2.2 AA** in code today: the semantic colour layer is asserted against 4.5:1 for text and 3:1 for meaning-bearing boundaries and focus indicators in `packages/shared/src/theme/contrast.test.ts`, and the MUI theme ships an unconditional focus-visible ring.

**Resolved: WCAG 2.2 AA is ratified at full scope** — colour contrast, screen-reader support, 44pt minimum touch targets, and reduced-motion behaviour. The engineering bar (contrast assertions in `contrast.test.ts`, the focus-visible ring, copy-button announcements, 44pt header targets) is now a product commitment, not an accident. Reduced-motion is already honoured across both runtimes (the wave train, marine snow, and logo sink all go calm under the OS flag, with tests) — an audit at ratification found only two unguarded DOM skeletons, since fixed.
