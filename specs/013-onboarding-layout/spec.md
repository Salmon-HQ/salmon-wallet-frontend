# Feature Specification: One fixed slot grid for onboarding, unlock, and the brand mark

**Feature Branch**: none — authored on `design/deep-water`

**Created**: 2026-08-17

**Status**: Draft

**Input**: The product owner asked why onboarding has no proper layout: "¿Por qué en el onboarding no hay un layout como corresponde en donde el ícono del salmón está siempre en un mismo lugar, el título de la screen también y su mini descripción también y por último también el o los input texts?" — and set the constraint that makes it more than a tidy-up: "Tiene que tener en cuenta todas las screens para saber qué espacios 'reservar' para cada cosa, como por ejemplo el 'What is a derivable?' debe obligar a todas las demás screens tener el botón más arriba para que cuando se llegue a esa screen que aparezca la pregunta y que no parezca que haya movido los botones para arriba solo recién ahí." He separately asked that the unlock ("Welcome back") screen be pulled into the same grid, and that the brand mark stop being a PNG.

This spec is the product of a source-level audit of every onboarding and unlock screen on all three apps. Numbers below are computed from literal source values; where a value is the result of a flex/auto split or a text wrap that cannot be resolved statically, it is marked INFERRED.

## The problem, stated in numbers

Nothing in this flow is fixed. Across the nine onboarding screens:

- The **brand mark** takes six sizes (48, 60, 72-as-icon, 80, 120, 137) and on one screen does not appear at all. Its top edge lands anywhere from Y=72 to Y=388 on web (a **316 px** spread) and Y=115 to Y=294.5 on mobile (a **179.5 px** spread).
- The **title** takes four sizes, three of them hardcoded rather than tokenised (24, 28, 32, 36), and three different line-heights for the same font size.
- The **gap between title and description** takes four values (8, 12, 24, 32).
- The **primary action's** top edge spans Y=592 to Y=876 on web — a **284 px** spread — and there is exactly one consecutive screen pair in either path whose action button does not move.

The specific jump the product owner is describing is the arrival at the screen carrying the "What is a derivable?" helper. That helper is `wallet.create.derivable_info_icon` and it lives on the **Success** screen (`packages/ui/src/components/AuthFlow/SuccessPage.tsx:93-101`, `apps/mobile/app/(auth)/success.tsx:98-104`) — not, as one would guess, on the derived-accounts screen.

**Quantified, and identically on both implementations:**

| Measurement                              | Value      | Derivation                                                                                                                                                                          |
| ---------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The helper's own footprint               | **60 px**  | `TextButton` height `componentSizes.buttonHeightSmall` = 44, plus the container's `gap: spacing.lg` = 16                                                                            |
| Primary action jump, arriving at Success | **132 px** | Success's action stack is `56 + 16 + 56 + 16 + 44 = 188` against the preceding screen's lone `56`. The helper is 60 of those 132; the "Check Derivables" secondary is the other 72. |
| Primary action jump, leaving Success     | **64 px**  | loses the helper's 60, plus a 4 px gap-token change (`spacing.lg` 16 → `spacing.md` 12)                                                                                             |

So the button really does move a full button-height, twice, around a single screen — and 60 px of that is attributable to the helper alone, exactly as reported.

That is the headline, but it is not the largest jump in the flow. Two others are worse and have the same root cause:

- **Mid-typing, on the recover screen.** `apps/mobile/app/(auth)/recover.tsx:172-176` mounts the "Next" button conditionally inside a `justifyContent: 'center'` column. The moment the twelfth valid word is typed, that 72 px (56 + 16 gap) is absorbed by the centring, and **the mark, title, description and input all jump up by 36 px simultaneously, while the user is typing**. The web/extension twin (`RecoverWalletPage.tsx:183`) already solved this with `visibility: 'hidden'` — it reserves the slot. That is the only place in the entire flow where a slot is reserved today, and it is the pattern this spec generalises.
- **On the derived-accounts screen**, an async network result (the derivation scan) changes the action stack from 96 px to 164 px after the screen has already painted — a **68 px** shift with no user input at all.
- **On the unlock screen, switching from the biometric variant to the password variant moves the brand mark 115.25 pt.** That is the largest single movement found anywhere in this audit, and it happens the moment Face ID fails — i.e. at the moment the user is already mildly alarmed.

### The unlock screen, measured

Unlock is not a variant of the onboarding password screen; it is three independent implementations that share nothing. `packages/ui` contains no lock component at all, so `apps/web/src/pages/lock/LockPage.tsx` and `apps/extension/src/pages/lock/LockPage.tsx` are near-verbatim duplicates of each other — same element order, same styled components, same numbers — diverging in exactly two places (web hardcodes `72` and `'14px 16px'` where the extension reads `componentSizes.lockScreenLogoSizeExtension` and `inputPaddingVertical`). Mobile's `LockContent.tsx` is a third, quite different implementation.

Against the onboarding password screen:

| Slot                  | Mobile lock | Mobile onboarding | Δ          | Web/ext lock | Web/ext onboarding | Δ          |
| --------------------- | ----------- | ----------------- | ---------- | ------------ | ------------------ | ---------- |
| Mark top              | 226.74      | 115               | **+111.7** | 293.5        | 281                | +12.5      |
| Mark box              | 124.09      | 120               | +4.1       | 72           | 60                 | +12        |
| Title top             | 378.20      | 259               | **+119.2** | 397.5        | 365                | +32.5      |
| Description           | **absent**  | present           | —          | present      | present            | 0          |
| Primary action top    | 522.10      | 722               | **−199.9** | 560.5        | 868                | **−307.5** |
| Primary action height | 45.91       | 56                | **−10.1**  | 56           | 56                 | 0          |

The action delta is the structural one: onboarding pins its action (`marginTop: 'auto'`, or a container at the end of a flex column) while unlock floats it inside a vertically-centred block. No amount of token-nudging closes a 307 px gap; unlock needs a bottom-pinned action region, which is what the grid gives it.

Everything optional on the unlock screen reflows the whole screen symmetrically, because all three platforms centre: the wrong-password error costs ±12.02 (mobile) / ±11.5 (web, extension) — the mark rises by half and the action descends by half — and the throttled state costs **±64.5 / ±56.1**. The throttle copy is already three lines at the measured inner widths (274.18 mobile, 268 web); Spanish will plausibly make it four, adding another ~±9.

**The biometric variant does not empty its slots — it deletes them.** On mobile the input, the primary action, the biometric button and the forgot link are all inside a single `showPasswordFallback` guard, so the biometric screen is two elements (mark and title) centred in the viewport. Web and extension have no biometric variant at all; the extension explicitly accepts and discards the capability (`onUnlockWithCachedKey: _onUnlockWithCachedKey`, `LockPage.tsx:162`).

### The mark's colour is not a design decision — it is the raster

This settles what the mark's white appearance on unlock means. `Logo.png` has a hardcoded near-white `#FCFCFC` baked into it. `brand.ts:14-17` says so in as many words: the source artwork hardcoded that value, "which allowed exactly one of those", and `markPaths` exists to make the mark take a token like any other ink. The mobile loading screen already draws the vector at `semantic.text.accent` = `salmon[500]` `#FF5C45` at a 96 pt box. So the two marks the product owner is comparing are the same artwork on two different pipelines: **white 197×183 raster in a 124.09 pt box on unlock, salmon vector at 96 pt on the loading screen**. The unlock mark is 1.29× the box and 1.30× the drawn width, and its colour is not chosen at all. Fixing FR-013 fixes the colour as a side effect.

### Two copy defects found on the way

Neither is a layout issue, but both are in scope for anyone touching these screens:

- **`lock.title` is `"Enter your password"`, not "Welcome back".** Web (`:225`) and extension (`:262`) call `t('lock.title', 'Welcome Back')` — but i18next's second argument is only a _defaultValue_, and the key exists, so both surfaces render "Enter your password". The `'Welcome Back'` string is dead code. Only mobile renders `lock.welcome_back`. The screen the product owner calls "Welcome back" says that on one platform of three.
- **`lock.wrong_password` ("Incorrect password. Please try again.") is used only by mobile.** Web and extension show `lock.error.invalid_password` = "Invalid password".

### Why it is like this

There is no shared onboarding shell anywhere. `apps/web/src/pages/auth/*` and `apps/extension/src/pages/auth/*` are thin adapters — the extension's are literally one-line re-exports — and all seven web/extension screens are implemented in `packages/ui/src/components/AuthFlow/`, where each one builds its own container, decides for itself whether to render a header, and re-derives its own spacing. `packages/ui/src/components/AuthFlow/common.ts` shares 20 lines of container chrome and nothing about slots. On mobile, `apps/mobile/app/(auth)/_layout.tsx` mounts the water and a `Stack` and nothing else; each of the nine screens re-declares its own `SafeAreaView`, its own scroll container, and its own spacing from scratch. Four distinct bottom-action strategies are in use across the mobile screens alone.

Two further structural facts make this worse than a set of inconsistent numbers:

- **Two incompatible spacing systems coexist in `packages/ui`.** `SelectOptionsPage`, `CreateWalletPage`, `RecoverWalletPage` and `PasswordPage` scale their vertical spacing through `vs()`/`ms()` from `packages/shared/src/utils/scaling.ts`; `SuccessPage`, `AnalyticsConsentPage` and `DerivedAccountsPage` use raw tokens. Meanwhile every _control_ (`buttonHeight` 56, `inputHeight` 56, `headerHeight` 56) is raw on all of them. Because `vs()` is `min(innerHeight, 956)/956`, the divergence grows as the window shortens: at a 740 px viewport `vs() = 0.774`, so half the flow compresses by 23% while the other half and every control hold still. The misalignment is therefore viewport-dependent, and at some heights individual gaps change sign.
- **`scaling.ts:23-38` caches the viewport dimensions on first read and never invalidates them.** There is no resize listener. On a user-resizable extension side panel, and on any browser window that is resized or any phone that is rotated, every `s()`/`vs()`/`ms()` value stays frozen at its first-paint reading.

### Two findings that change the premise

**1. `DESIGN.md` is wrong about the extension surface, and the error is load-bearing.** `DESIGN.md:526-529` states that the extension opens as a side panel with full viewport height, and concludes that "vertical space is _not_ the constraint an extension popup would impose". The shipped Chrome manifest says otherwise:

```
"action": { "default_title": "Salmon Wallet", "default_popup": "popup.html" },
"side_panel": { "default_path": "sidepanel.html" }
```

Both entrypoints exist (`apps/extension/src/entrypoints/popup/`, `.../sidepanel/`). `apps/extension/src/entrypoints/background.ts:406-407` calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, but Chrome ignores that when the action declares a `default_popup` — and the Firefox branch immediately below (`:410`) explicitly clears the popup first with `setPopup({ popup: '' })`, which is the proof that the authors knew the clearing step is required. Chrome never gets it. Every Playwright script in `apps/extension/.playwright/` drives `popup.html`, at a 360×600 viewport (`scripts/lib.mjs:163`).

So on the shipping Chrome build the flow renders in an action popup with a hard **600 px** ceiling, and `popup/index.html` sets `overflow: hidden` on `html`, `body` and `#root` — meaning content past the fold is **clipped and unreachable, not scrollable**. Three states already exceed or nearly exceed that ceiling today: the seed-phrase step at 594.1 px (5.9 px of headroom), the validate step at 572, and the password screen's worst case at 556.3 — before Spanish expansion, which `DESIGN.md:539` puts at 15-25%.

**2. The brand mark is a raster image on every screen that matters, while a vector already exists.** `packages/shared/src/theme/brand.ts` exports `markPaths` (viewBox `0 0 253 236`) and `markToSvg(fill, size?)` on a single-`fill` tintable contract, generated to be the canonical mark. It is consumed by exactly two call sites — the two `LoadingScreen` components — and both draw the paths inline, which is what `brand.ts:53` instructs. Everything else uses `<img src="/images/Logo.png">`. There are **17 such call sites across 13 files**, and they include every onboarding screen:

| Location                                   | Sites                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/AuthFlow/`     | `SelectOptionsPage.tsx:100`, `CreateWalletPage.tsx:175,219,307`, `RecoverWalletPage.tsx:159`, `PasswordPage.tsx:274`, `SuccessPage.tsx:81`, `DerivedAccountsPage.tsx:331` |
| `packages/ui/src/components/DAppApproval/` | `DAppConnectApprovalView.tsx:57`, `DAppSignMessageApprovalView.tsx:101`, `DAppTransactionApprovalView.tsx:70`, `DAppSignInApprovalView.tsx:114`                           |
| `packages/ui/src/components/AboutPanel/`   | `AboutPanel.tsx:231`                                                                                                                                                      |
| `apps/web`                                 | `pages/lock/LockPage.tsx:224`, `components/DAppApprovalGate.tsx:137,154`                                                                                                  |
| `apps/extension`                           | `pages/lock/LockPage.tsx:260`                                                                                                                                             |

`Logo.png` is **197×183 px** in all three copies (`apps/web/public/images/`, `apps/extension/public/images/`, `packages/assets/src/images/`). It is drawn into square boxes of 48, 60, 80 and 120 CSS px with `objectFit: 'contain'`, so it always letterboxes; and at 120 px on a 3× device it is asked for 360 device pixels of detail from 197, i.e. **1.8× undersampled**. That is the softness that is visible on a real phone. The vector's aspect ratio is 253/236 = 1.072 against the PNG's 197/183 = 1.077 — a 0.4% difference, so a swap is geometrically near-identical provided the slot drives width and lets height follow.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Moving between onboarding steps reads as content changing, not the page being rebuilt (Priority: P1)

A person creating or recovering a wallet moves through the flow and sees the salmon mark, the screen title, the one-line description and the input field stay exactly where they were, with only their contents changing.

**Why this priority**: This is the request, and it is the first impression of the product. A flow whose furniture moves under the user reads as unfinished at the precise moment a wallet is asking to be trusted with money.

**Independent Test**: Render every screen in the flow at a fixed viewport and compare the top edge of each named slot across all of them.

**Acceptance Scenarios**:

1. **Given** any two screens in the create path, **When** both are rendered at the same viewport, **Then** the brand mark's top edge is at the identical Y on both.
2. **Given** any two screens in the recover path, **When** both are rendered at the same viewport, **Then** the title's top edge and the description's top edge are each at the identical Y on both.
3. **Given** the screen carrying "What is a derivable?" and the screens immediately before and after it, **Then** the primary action's top edge is identical on all three, and the helper appears in space that was already reserved and already empty on the neighbours.
4. **Given** the recover screen with an incomplete phrase, **When** the phrase becomes valid and the Next action becomes available, **Then** no slot above the action moves by any amount.
5. **Given** the derived-accounts screen, **When** the derivation scan completes and changes how many actions are offered, **Then** the primary action's top edge does not move.

---

### User Story 2 - The unlock screen belongs to the same flow (Priority: P1)

A returning user sees the "Welcome back" screen composed on the same grid as onboarding: same mark in the same place at the same size, same title position, same field position, same action position.

**Why this priority**: Unlock is the most-seen screen in the product and the screen a returning user meets immediately after onboarding. Today it is three independent implementations with their own one-off spacing tokens (`spacing.lockScreenGap` 22, `spacing.lockScreenSectionGap` 31, `spacing.lockScreenPadding` 36) and their own mark tokens (`componentSizes.lockScreenLogoSize` 140, `lockScreenLogoSizeExtension` 72) — none of which appear anywhere in onboarding. `DESIGN.md:517` already names those one-offs as debt to retire. The primary action sits 200 pt (mobile) / 307 px (web, extension) higher than onboarding's.

**Acceptance Scenarios**:

1. **Given** the unlock screen and the onboarding password screen, **Then** the mark, title, description and field slots have identical top edges on both. Today the mark differs by 111.7 pt on mobile and the action by 199.9 pt.
2. **Given** the biometric variant of unlock, **Then** the field and action slots are reserved and the mark does not move relative to the password variant. Today the biometric variant deletes those slots and the mark sits 115.25 pt lower.
3. **Given** a wrong password, **When** the error and the disabled action appear, **Then** no slot moves. Today the mark rises 12.02 pt and the action descends 12.02 pt (mobile; 11.5 px on web and extension).
4. **Given** the throttled state, whose copy is longer, **Then** no slot moves. Today it costs ±64.5 pt on mobile and ±56.1 px on web and extension, and the copy is already three lines before Spanish expansion.
5. **Given** the unlock screen on any platform, **Then** its primary action has the system `componentSizes.buttonHeight` and its field the system `componentSizes.inputRadius`. Today mobile overrides the button to 45.91 pt and the field to `borderRadius.badge` 9.

---

### User Story 3 - The mark is drawn, not photographed (Priority: P2)

The salmon mark renders crisply at every size on every density, and takes its colour from a theme token.

**Why this priority**: It is a one-line-per-site change with an existing, generated, tested source of truth, and it removes a 197 px raster from a 360-device-pixel box. It also removes the last reason the mark's size is chosen per screen: a vector has no native size to defer to.

**Acceptance Scenarios**:

1. **Given** any onboarding, unlock or approval screen, **Then** the mark is drawn from `markPaths` and takes a single `fill` from a theme token, and no `<img src="/images/Logo.png">` remains in `packages/ui` or in either app's onboarding or lock surface.
2. **Given** the mark at the grid's size, **Then** its aspect ratio is `markAspectRatio` and it is not letterboxed inside a square box.

---

### Edge Cases

- **The extension popup cannot hold the grid.** At 600 px with `overflow: hidden`, a fixed grid plus a seed grid plus an action does not fit, and the failure mode is an unreachable button rather than a scrollbar. Addressed by FR-012 and the degradation ladder.
- **Spanish expansion of 15-25%** turns one-line titles and terms lines into two lines. Reserved heights are specified at two lines for the title and two for the terms line for this reason.
- **The create-path message screen's body copy** (`wallet.create.messageBody`) renders as roughly 12-16 lines — 282-384 px depending on platform and width. It is not a "mini description" and must not be forced into the description slot; it belongs in the flexible body region. Separately, its two literal `\n\n` paragraph breaks are collapsed by MUI Typography's default `white-space: normal`, so three intended paragraphs render as one block.
- **The seed-display and recover screens run `useSecretScreen`**, which sets `FLAG_SECURE` on Android and blanks the capture on iOS. They can be verified from source and by assertions on rendered geometry, but they cannot be screenshotted, and no verification approach may attempt to defeat that.
- **`apps/mobile/app/(auth)/biometric.tsx` is an unreachable duplicate** of `biometric-setup.tsx` with six differing layout values. Nothing navigates to it and it is not registered in `(auth)/_layout.tsx`. Left in place, it becomes a silently divergent second copy of a screen this spec pins.
- **`getAuthContainerStyles(contained = true)`** (formerly `common.ts:13-22`) described a 380×min(760, 100vh−48) card that no caller ever requested. **Resolved: it was dead and has been deleted** — once the grid owned the container the `contained = false` branch lost its callers too, so the helper and the `contained` prop were removed (see the note at `packages/ui/src/components/AuthFlow/types.ts:1-6`).
- The mobile create and recover screens paint themselves opaque on `surface.bedrock` and opt out of the water, per the Bedrock Rule. The grid governs slot positions; it must not change which screens carry a motif.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A single named slot grid MUST govern every screen listed in _Screens in scope_. Slots are, in order: `chrome`, `mark`, `title`, `description`, `body`, `assist`, `secondary`, `action`.
- **FR-002**: Every slot except `body` MUST have a reserved height expressed in existing design tokens, and MUST occupy that height whether or not it has content. A screen that does not use a slot leaves it empty; it does not collapse it.
- **FR-003**: `body` is the single flexible slot. It absorbs all height difference between screens, and it is the only region permitted to scroll.
- **FR-004**: The primary action's top edge MUST be identical across every screen in scope at a given viewport. This is the checkable form of the request.
- **FR-005**: The `assist` band sits directly above the actions and is reserved at the height of the tallest thing that can occupy it. On the Success screen it holds "What is a derivable?"; on the password screens the terms line; on the unlock screen the error or throttle message; on error states the retry affordance. It is present and empty everywhere else.
- **FR-006**: No conditional element anywhere in the flow may change the position of any other element. Where an element appears and disappears, its space is reserved — following the existing precedent at `RecoverWalletPage.tsx:183`.
- **FR-007**: Asynchronous results (the derivation scan, biometric availability) MUST NOT change any slot position after first paint.
- **FR-008**: One title typography token and one description token across the whole flow. The hardcoded 28/32/36 sizes and the three divergent line-heights are removed.
- **FR-009**: One mark size across the whole flow, in a token, drawn from `markPaths`. The welcome screen's title/mark order inversion is resolved in favour of the grid order.
- **FR-010**: The unlock screen composes on the same grid, with a bottom-pinned action. Its one-off tokens are retired or aliased and no new ones are introduced; its control overrides (button height, field radius, the forgot link's inherited line-height) are removed in favour of the system tokens. Because `packages/ui` has no lock component today and the web and extension copies are near-verbatim duplicates, the DOM lock screen SHOULD become a single shared component alongside the grid rather than two files kept in sync by hand.
- **FR-011**: Both spacing systems in `packages/ui` MUST be reconciled to one. Given that `scaling.ts` caches dimensions and never invalidates them, and that controls are raw while their surroundings are scaled, the grid SHOULD be expressed in raw tokens with an explicit degradation ladder rather than in `vs()`/`ms()`.
- **FR-012**: The grid MUST define its behaviour when the union of reserved heights exceeds the viewport, per the degradation ladder below. On a surface where overflow is clipped rather than scrolled, the action MUST remain reachable.
- **FR-013**: The mark MUST render from the vector on all 17 identified call sites, with the aspect ratio preserved and the fill taken from a token.
- **FR-014**: Slot geometry MUST live in one place per platform and be consumed, not re-derived: a DOM layout component in `packages/ui` for web and extension, a React Native one in `apps/mobile`, over a shared semantic contract in `packages/shared/src/types/ui`. The reserved heights themselves belong in `packages/shared/src/theme` so both platforms read one set of numbers.
- **FR-015**: All existing `testID` / `data-testid` values MUST survive, and the Maestro and Playwright suites MUST pass unchanged.
- **FR-016**: No user-facing copy changes as part of this work. If any is introduced, it ships in English and voseo Spanish per the `i18n-authoring` skill.

### Ownership

| Artifact                                                 | Package                                                                          | Why                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Slot names, order, reserved-height tokens                | `packages/shared/src/theme`                                                      | one set of numbers, read by all three apps                                                                         |
| Cross-platform layout contract (`OnboardingLayoutProps`) | `packages/shared/src/types/ui`                                                   | the repo's established home for `PropsBase`-style contracts                                                        |
| DOM layout component + all `AuthFlow` screens            | `packages/ui`                                                                    | web and extension already share every one of these screens                                                         |
| DOM lock screen (new; today duplicated per app)          | `packages/ui`                                                                    | the two app copies are near-verbatim and drift by construction                                                     |
| React Native layout component + `app/(auth)/*`           | `apps/mobile`                                                                    | RN cannot live in `packages/shared` or `packages/ui`                                                               |
| Vector mark component                                    | one in `packages/ui` (inline `<svg>`), one in `apps/mobile` (`react-native-svg`) | both patterns already exist in the two `LoadingScreen` components and should be extracted from them, not rewritten |

Nothing browser-specific or RN-specific may move into `packages/shared`; `packages/shared` must stay importable from React Native, and `packages/ui` is DOM-only and must not be imported by `apps/mobile`.

## The proposed slot grid

Expressed in existing tokens from `packages/shared/src/theme/spacing.ts`. "Reserved" is the height the slot occupies whether or not it is filled.

| #   | Slot          | Reserved height       | Token derivation                                                | Holds                                                                                                    |
| --- | ------------- | --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | `chrome`      | 56                    | `componentSizes.headerHeight`                                   | back affordance and step dots; present and empty where there is neither                                  |
| 2   | `mark`        | 80 + 24 = **104**     | `componentSizes.logoSizeSmall` + `spacing['2xl']`               | the salmon mark, one size, vector, aspect-corrected                                                      |
| 3   | `title`       | 2 × 32 + 12 = **76**  | `fontSize['2xl']` at `lineHeight` 32, + `spacing.md`            | the screen title; two lines reserved for Spanish                                                         |
| 4   | `description` | 2 × 24 + 24 = **72**  | `fontSize.md` at 24, + `spacing['2xl']`                         | the one-line description; two lines reserved for Spanish                                                 |
| 5   | `body`        | **flexible, min 0**   | —                                                               | inputs, seed grid, account list, long warning copy, loading and empty states. The only scrolling region. |
| 6   | `assist`      | **60**                | `componentSizes.buttonHeightSmall` 44 + `spacing.lg` 16         | the derivable helper, the terms line, error and throttle messages, retry links                           |
| 7   | `secondary`   | 56 + 16 = **72**      | `componentSizes.buttonHeight` + `spacing.lg`                    | one secondary action                                                                                     |
| 8   | `action`      | 16 + 56 + 24 = **96** | `spacing.lg` + `componentSizes.buttonHeight` + `spacing['2xl']` | the primary action, bottom-pinned                                                                        |

**Fixed total (everything but `body`): 56 + 104 + 76 + 72 + 60 + 72 + 96 = 536 px.** Plus the platform's bottom safe-area inset on mobile. (This sum is exactly what the `packages/shared` test in the test strategy must pin: the total and its parts have to be asserted together, or a change to one token silently desynchronises the grid.)

The `assist` band is the direct answer to the product owner's constraint: it is 60 px, which is exactly the derivable helper's measured footprint, and it is present and empty on every other screen. Arriving at Success reveals the link inside space that was always there, and the button does not move.

The `secondary` band is reserved at one control because six of the nine screens have exactly one. The welcome screen may offer up to three actions when `hasAccounts` is true; it is the sanctioned exception (see _Migration notes_).

### Available height, by surface

| Surface                                   | Available | `body` gets | Verdict                                                                                          |
| ----------------------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Phone, 844 pt frame less insets           | 751       | 215         | fits the seed grid (180) and the account list; **too tight for the 3-input validate step (254)** |
| Extension side panel at 956               | 956       | 420         | comfortable                                                                                      |
| Extension side panel on a 1440×900 laptop | ~780      | ~244        | fits the seed grid; validate step needs rung 1                                                   |
| **Chrome action popup**                   | **600**   | **64**      | **does not fit** — the seed grid alone is 180                                                    |

### Degradation ladder

Triggered on available height, not on platform:

1. **< 800 px** — `description` drops from two reserved lines to one (−24) and `mark` drops from 80 to `componentSizes.iconSize3XL` 48 (−32). Fixed total **480**; on a phone that gives `body` 271, which clears the validate step's 254. This rung is therefore the _normal_ phone case, not an exception.
2. **< 640 px** — `mark` is omitted on the body-heavy screens (seed display, validate, derived accounts) (−104 more). Fixed total **376**. The mark's absence is a documented degradation applied to a named set of screens, not a per-screen judgement call.
3. **Any height** — `body` scrolls internally. `chrome`, `mark`, `title` and `description` stay pinned above it and `assist`, `secondary` and `action` stay pinned below it, so the action is always reachable and always at the same Y. This is what makes FR-012 satisfiable on a clipped surface, and it is the rung that actually saves the Chrome popup.

Even at rung 2 the Chrome popup leaves `body` only 224 px, which clears the seed grid but not the validate step. The honest conclusion is that rung 3 is doing all the work there, and that the popup should not exist: `apps/extension/src/entrypoints/popup/` is a WXT-generated accident that overrides the side panel the design was written for. Removing it makes `DESIGN.md:526-529` true and gives the flow the full viewport it was designed against. That is a distinct decision with distribution consequences and is raised as an open question rather than assumed here.

### Keyboard-open behaviour

Today: the three mobile `KeyboardAvoidingView`s have no `keyboardVerticalOffset`, sit at inconsistent depths relative to the header, and disagree on `keyboardDismissMode`; the recover screen has none of the dismissal affordances the others have. On web and extension there is no `dvh`, no `svh`, no `visualViewport` listener and no `interactive-widget` directive, while the containers are `100vh` inside an `overflow: hidden` parent — so when a soft keyboard opens, the layout does not shrink and the action is not recoverable by scrolling. The validate step calls `autoFocus`, which opens the keyboard on arrival.

Required behaviour, on both platforms:

- `mark` and `description` collapse to zero while the keyboard is open. They are decorative and explanatory respectively, and neither is needed while typing.
- `chrome`, `title`, `body`, `assist` and `action` hold. The field being typed into and the button that commits it must both remain visible without scrolling.
- The collapse is the _only_ sanctioned slot movement in this spec, it is symmetric on dismissal, and it is driven by a single shared keyboard-visibility signal rather than per screen.
- Web and extension must measure the visual viewport rather than assume `100vh`.

### Accessibility and dynamic type

Onboarding currently applies no `maxFontSizeMultiplier` and no `allowFontScaling` anywhere, while the rest of the mobile app scales through `react-native-size-matters` — so onboarding is governed by neither system. Hardcoded `lineHeight` values of 32/36/40 against OS-scaled font sizes will clip at large text settings.

- `title` and `description` MUST cap at `fontScaleCap.chrome` (1.3), the existing token for "chrome with little room". Their reserved heights are specified at two lines, which absorbs the cap.
- Beyond the cap, or where a translation still overflows two lines, the slot grows and `body` shrinks to compensate. `body` is the give in the system; the action never moves.
- Below a `body` height of zero, `body` scrolls (ladder rung 3).
- The mark is a graphic and does not scale with text.
- Reserving space for an absent element must not put it in the accessibility tree: an empty `assist` band is not an empty announced element, and a reserved-but-hidden control must be genuinely unfocusable, not merely transparent.

## Screens in scope

Implementation may not skip one. Mobile screens are `apps/mobile/app/(auth)/`; web and extension screens are the shared implementations in `packages/ui/src/components/AuthFlow/`, reached through thin adapters in `apps/web/src/pages/auth/` and `apps/extension/src/pages/auth/`.

**Entry**

1. Welcome / select options — `index.tsx` · `SelectOptionsPage.tsx`

**Create path** 2. Seed-safety message — `create.tsx` step `message` · `CreateWalletPage.tsx` `MessageStep` 3. Seed display — `create.tsx` step `seedPhrase` · `CreateWalletPage.tsx` `SeedPhraseStep` _(capture-blocked)_ 4. Seed confirmation — `create.tsx` step `validate` · `CreateWalletPage.tsx` `ValidateStep`

**Recover path** 5. Seed entry — `recover.tsx` · `RecoverWalletPage.tsx` _(capture-blocked)_

**Shared tail** 6. Password creation — `password.tsx` · `PasswordPage.tsx`, in both its two-field and single-field variants 7. Creating/recovering wait state — the `LoadingScreen` overlay at `password.tsx:447` and `PasswordPage.tsx:352-362` 8. Biometric opt-in — `biometric-setup.tsx` (mobile only; no web/extension equivalent) 9. Analytics consent — `analytics-consent.tsx` · `AnalyticsConsentPage.tsx` 10. Success, carrying the derivable helper — `success.tsx` · `SuccessPage.tsx` 11. Derived accounts, in all three of its states (loading, empty, populated) and its partial-scan-failure variant — `derived-accounts.tsx` · `DerivedAccountsPage.tsx`

**Unlock** 12. Unlock, password variant — `apps/mobile/src/components/GateContainer/LockContent.tsx` · `apps/web/src/pages/lock/LockPage.tsx` · `apps/extension/src/pages/lock/LockPage.tsx` 13. Unlock, biometric variant — mobile only today; web and extension have no such variant 14. Unlock, wrong-password error state 15. Unlock, throttled state 16. Unlocking wait state — `LoadingScreen`, whose mark is currently centred independently of every other screen's

**Error and retry states within the above**: invalid seed phrase, recovery failure, recovery network failure, biometric enrolment failure, derivation partial failure. Each is an `assist`-band occupant, not a new screen.

**Explicitly out of scope**: the dApp approval screens. They share the mark change (FR-013) but not the grid.

## Test strategy

Asserting a rendered Y across screens is the test that matches the requirement. A snapshot cannot express "identical across N screens" and will pass while every screen drifts together.

- **Web and extension (Playwright, `apps/web/.playwright/` and `apps/extension/.playwright/`)** — one table-driven test that visits every screen in scope at a fixed viewport, reads `getBoundingClientRect().top` for each slot's `data-testid`, and asserts every screen agrees. This is the load-bearing test: it fails on exactly the defect reported, and it is the only place the full flow can be measured cheaply. Run it at 360×600 and at 400×956 so both the popup and the panel are covered, and at a Spanish locale so expansion is exercised.
- **`packages/ui` (Vitest + Testing Library)** — assert that each `AuthFlow` screen renders the shared layout component and passes the expected slots, and that no screen sets its own vertical margins on a slotted element. This catches a regression at authoring time rather than at e2e time.
- **`packages/shared` (Vitest)** — pin the reserved-height table and the degradation thresholds, in the manner of the existing `controlRadius.test.ts` and `flesh.test.ts`, so a value cannot drift silently. Assert the fixed total equals the sum of its parts, so a change to one token cannot desynchronise the grid.
- **`apps/mobile` (Jest)** — jsdom cannot resolve React Native flex geometry, so assert the contract instead: every `(auth)` screen renders the layout component, the layout component's reserved heights come from the shared table, and the conditional elements (recover's Next, derived-accounts' primary) render in a reserved container in both their present and absent states.
- **Mobile visual confirmation (Maestro, from `apps/mobile/.maestro/`)** — the two seed screens cannot be captured. Confirm the reachable screens and rely on the contract tests for the two that are not. Any run must pass the device explicitly.
- **Contrast and token tests** already in `packages/shared/src/theme` must keep passing; the mark's fill change touches them.

## Migration notes, per screen

| Screen                | What has to change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Risk                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome / select      | Title currently renders _above_ the mark — the only screen that does. It moves below. The "Salmon" wordmark becomes the `title` slot's content and the welcome line becomes the `description`. The conditional third action (`hasAccounts`) exceeds the reserved `secondary` band.                                                                                                                                                                                                                                                                                         | **Grid cannot be fully satisfied.** Sanctioned exception: this screen has no predecessor in the flow, so nothing shifts _into_ it. Either the third action becomes a text affordance in `assist`, or the screen is documented as the one permitted overflow. Needs a decision.                                                           |
| Create / message      | The 12-16 line body copy moves from the description slot to `body`. The `\n\n` collapse bug is fixed or the copy is restructured. This screen already overflows on mobile — its content sums to 749 against 695 available, putting the action below the fold on first paint.                                                                                                                                                                                                                                                                                               | Medium. The copy is long enough that the grid alone will not save it; it likely needs shortening, which is a copy decision and therefore an i18n change.                                                                                                                                                                                 |
| Create / seed display | Currently the only screen that top-packs rather than centring, leaving its commit button floating 173 pt (mobile) / 308 px (web) above the bottom. Moves to the grid; the seed grid becomes `body`. Two stacked button containers produce a 40 px inter-button gap instead of 16 — reconciled.                                                                                                                                                                                                                                                                             | Medium. Capture-blocked, so verification is contract tests plus source review. A 24-word phrase doubles the grid to 8 rows and must be checked against `body` at every degradation rung.                                                                                                                                                 |
| Create / validate     | Straightforward. `autoFocus` means the keyboard opens on arrival, so this is the primary test case for the keyboard collapse rule.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Low.                                                                                                                                                                                                                                                                                                                                     |
| Recover               | The conditional Next button adopts the reserved-slot pattern its own web twin already uses. This removes the 36 px mid-typing jump — the single worst defect found. The bulk `minHeight: 160` textarea is not the `inputHeight` token and needs a `body`-relative height.                                                                                                                                                                                                                                                                                                  | Low, high value. Capture-blocked.                                                                                                                                                                                                                                                                                                        |
| Password              | Hardcoded 28/36 type becomes the token. The description is currently _removed_ in the single-field variant, dropping 56 px; it becomes reserved-and-empty. Strength meter, two field errors, form error and terms line all move into `assist` — their union is ~130 px against a 60 px band.                                                                                                                                                                                                                                                                               | **Highest risk.** The `assist` band as specified does not hold everything this screen can show at once. Either the band is taller (at a cost to every other screen), or the strength meter moves into `body` below the fields where it belongs semantically. Needs a decision; the second option is preferred and is the cheaper change. |
| Wait states           | Full-screen overlays that replace the layout. They should adopt the `mark` and `title` slot positions so the mark does not jump when the overlay appears — the Unlocking Wallet screen currently centres its mark independently.                                                                                                                                                                                                                                                                                                                                           | Low.                                                                                                                                                                                                                                                                                                                                     |
| Biometric opt-in      | Carries an 80 px icon _between_ mark and title that exists nowhere else; it moves into `body`. Two `marginTop: 'auto'` boundaries are replaced by the grid. Renders `null` until availability resolves, producing a blank frame then a full layout — must not move slots (FR-007).                                                                                                                                                                                                                                                                                         | Low.                                                                                                                                                                                                                                                                                                                                     |
| Analytics consent     | Has no mark at all and no header; a 72 px chart icon stands in. It gains both. Title drops from 36 to the token. Its description is the longest in the flow at ~7 lines / 189-216 px and moves to `body`. The absolute close button reserves nothing and becomes the `chrome` back affordance.                                                                                                                                                                                                                                                                             | Medium — this screen changes the most visibly.                                                                                                                                                                                                                                                                                           |
| Success               | Gains the `chrome` band it currently lacks. Mark drops from 80/137 to the token size. The derivable helper moves into the reserved `assist` band; the secondary into `secondary`. **This is the screen the request is about and the one whose acceptance is measured.**                                                                                                                                                                                                                                                                                                    | Low.                                                                                                                                                                                                                                                                                                                                     |
| Derived accounts      | Renders a 56 px header with an invisible disabled back button; it either gains a real back affordance or is documented as intentionally empty chrome. The conditional primary adopts the reserved pattern, removing the 68 px async shift. Mark grows from 48 to the token size.                                                                                                                                                                                                                                                                                           | Low.                                                                                                                                                                                                                                                                                                                                     |
| Unlock, all variants  | Three independent implementations converge. The action becomes bottom-pinned (closing a 199.9 pt / 307.5 px gap against onboarding). The mark drops from 124.09 pt to the grid size and becomes the tinted vector. The biometric variant reserves the field and action slots instead of deleting them, removing the 115.25 pt mark jump. Error and throttle copy occupy `assist`. Mobile's overrides — 45.91 pt button, `borderRadius.badge` 9 field, the forgot link inheriting the title's 33.55 line-height — are removed. The four `lockScreen*` one-offs are retired. | **High.** The throttle notice at ±64.5 pt does not fit a 60 px `assist` band; it needs the ladder's `body` region or its own reserved height. Web and extension have no biometric variant to reserve for, so the reservation rule differs by platform there.                                                                             |
| Unlock — copy         | `lock.title` renders "Enter your password" on web and extension because the `'Welcome Back'` argument is a defaultValue for a key that exists; and `lock.wrong_password` is mobile-only. Both need a decision, not a silent fix.                                                                                                                                                                                                                                                                                                                                           | Low, but it is the screen's name.                                                                                                                                                                                                                                                                                                        |
| `biometric.tsx`       | Unreachable duplicate with six divergent values. Delete, or bring onto the grid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Low, but leaving it re-introduces the divergence this spec exists to remove.                                                                                                                                                                                                                                                             |

## Success Criteria _(mandatory)_

- **SC-001**: The primary action's top edge is identical across all 16 screens in scope, at both 360×600 and 400×956, in both English and Spanish. Today the spread is 284 px on web.
- **SC-002**: The brand mark's top edge is identical across all screens that render it at a given degradation rung. Today the spread is 316 px on web and 179.5 px on mobile.
- **SC-003**: Arriving at and leaving the Success screen moves no slot. Today those transitions move the primary action 132 px and 64 px.
- **SC-004**: Typing the final word of a recovery phrase moves no slot. Today it moves every slot on the screen by 36 px.
- **SC-005**: The derivation scan completing moves no slot. Today it moves the primary action 68 px.
- **SC-006**: On every surface and at every degradation rung, the primary action is visible and reachable without scrolling. Today three states exceed the Chrome popup's 600 px ceiling, where overflow is clipped rather than scrolled.
- **SC-007**: No `<img src="/images/Logo.png">` remains in `packages/ui` or in either app's onboarding, unlock or approval surfaces; all 17 sites draw the vector.
- **SC-008**: One title token and one description token are used across the flow; the hardcoded 28/32/36 sizes are gone.
- **SC-009**: With the keyboard open on the password and seed-entry screens, the focused field and the primary action are both visible without scrolling.
- **SC-010**: The unlock screen's mark, title, field and action slots match the onboarding password screen's at the same viewport. Today the mobile deltas are +111.7, +119.2 and −199.9 pt.
- **SC-011**: Switching between the biometric and password variants of unlock moves no slot. Today the mark moves 115.25 pt.
- **SC-012**: The wrong-password and throttled states of unlock move no slot. Today they cost ±12 pt and ±64.5 pt.
- **SC-013**: All existing Maestro and Playwright suites pass unchanged.

## Assumptions

- Web and extension share every onboarding screen through `packages/ui/src/components/AuthFlow/`; the app-level files are adapters. The grid is therefore built twice, not three times: once in `packages/ui`, once in `apps/mobile`.
- `packages/shared/src/theme/brand.ts` is the canonical mark and both `LoadingScreen` components are the reference implementations of drawing it. The extraction is from existing code, not new code.
- The six-value spacing rhythm at `DESIGN.md:517` (4, 8, 12, 16, 24, 32, plus 48) is the rule for this work, and the one-off tokens named there — including the four `lockScreen*` values — are the debt this spec is entitled to retire.
- No backend contract is touched; `../salmon-wallet-backend` is unaffected.
- The Ethereum surface is untouched.

## Decisions taken by the product owner (2026-08-18)

These three were open when the spec was written and are now settled. The
sections above stand except where these override them.

1. **The primary action becomes the bottom-most control in its stack**
   (open question 4). This pins its Y for free — no empty band has to be
   reserved above it — and the recover screen already orders it that way.
   The `assist` band still exists for the helper and the error messages,
   but it now sits _above_ the action rather than below it, so revealing
   the "What is a derivable?" link cannot move the button at all.

2. **`lock.title` is corrected to "Welcome back" on all three platforms**
   (open question 9). The key already exists; web and extension were
   passing `'Welcome Back'` as an i18next `defaultValue` for it, which is
   dead code that also disagreed with the key's own value. Fix the key in
   both locales, delete the `defaultValue` at every call site, and follow
   the `i18n-authoring` skill — never guess the Spanish.

3. **The extension is a side panel, not a popup** (open question 1) — but
   the audit's measurement was still correct, and the resolution is not
   what either half suggested. Verified against source and the built
   artifact:

   - `wxt.config.ts` declares `side_panel.default_path` and **does not**
     declare `action.default_popup`.
   - The _built_ `dist/chrome-mv3/manifest.json` carries
     `"action": {"default_popup": "popup.html"}` anyway. WXT synthesises
     it from the mere existence of `src/entrypoints/popup/`. Nobody wrote
     it.
   - `background.ts` calls
     `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
     at runtime, which is what actually opens the side panel; the Firefox
     branch clears the popup explicitly and toggles `sidebarAction`.

   So the side panel is correct behaviour achieved by a runtime
   correction over a manifest that declares the opposite. Under MV3 the
   background service worker is not persistent, so a first click before
   the worker has woken opens the popup — the 600px clipped surface the
   audit measured. That is a real state, just not the common one.

   **The layout work does not have to satisfy the 600px popup ceiling.**
   The ambiguity gets removed at its source instead, as separate work:
   either delete the popup entrypoint so the manifest never declares one,
   or make the popup a deliberate redirect into the side panel. Either
   makes the entrypoint independent of whether a worker happened to be
   awake. Until that lands, treat the popup as a degraded first-click
   state, not as a target surface.

### Second round of decisions (2026-08-18)

4. **Canonical mark size is 80 (`logoSizeSmall`) on every screen except
   unlock** (open question 2), which keeps its larger mark — the screen
   is the app's front door and the mark is the point there. The `mark`
   slot's reserved height is therefore driven by unlock, and every other
   screen centres its 80 inside that reserved band rather than shrinking
   the band. This is what keeps the mark from moving between the unlock
   screen and everything that follows it.

5. **The throttled-unlock notice takes the action slot** (open question
   3). While the wallet is throttled the button cannot be pressed
   anyway, so the notice occupies its place: nothing moves, and the user
   is told why in the exact spot they were about to press. Two things
   the implementation must get right — the notice must say **when the
   next attempt is allowed**, not merely that the wallet is locked out,
   and focus must move to the notice when it replaces the control, then
   back to the control when it returns, so a screen-reader user is not
   left focused on a node that vanished.

6. **The password strength meter moves into `body`, directly under the
   field it describes** (open question 5). It is feedback about that
   input, it belongs against it, and moving it frees `assist` for the
   helper link and the error messages.

7. **The recovery-phrase warning gets its own screen, before the phrase
   is shown** (open question 6). The product owner's reasoning, and it
   is the right one: _"psicológicamente, si muestro una pantalla para
   esto doy a entender que es importante."_ A warning that shares a
   screen with the thing it warns about is read as boilerplate; a
   warning that costs its own step is read as a gate.

   So `wallet.create.messageBody` is **not shortened** — the loss and
   theft consequences rewritten today survive intact — and it is not
   forced to fit alongside the phrase. It becomes a consequence screen
   in its own right, which also removes the tallest block from the grid
   and lets `body` hold the phrase alone.

   Notes for implementation: this **adds a screen to the create flow**,
   so the flow's screen list, its progress indicator, and its back
   behaviour all change. The screen must not be skippable by reflex —
   whatever advances it should require a deliberate act, not a button
   parked under the thumb. It must exist on all three platforms, and its
   copy is already written; do not rewrite it, and follow the
   `i18n-authoring` skill for anything new. This is the flow that
   handles key material: never log, screenshot or fixture a real phrase.

8. **Biometric unlock stays mobile-only** (open question 10). Web and
   extension collapse the slot rather than reserving it; adding
   WebAuthn/passkey unlock there is separate work with its own
   key-storage implications, not a layout decision.

### Resolved by measurement, no decision needed

- **`getAuthContainerStyles` is not dead** (open question 7): five
  screens call it. What is never exercised is its `contained = true`
  branch — the 380×760 card — because no caller passes it. Delete the
  branch or give it a caller; do not delete the function.
- **`apps/mobile/app/(auth)/biometric.tsx` is orphaned** (open question
  8). It sits beside `biometric-setup.tsx`, and the only route in the
  flow is `password.tsx` → `/(auth)/biometric-setup`. Nothing reaches
  `biometric`. Confirm once more at implementation time, then delete it.

## Open questions

Only where the code and `DESIGN.md` genuinely could not settle it:

1. **Should the Chrome action popup be removed** so the side panel opens as `DESIGN.md` describes? It is a one-line change to `wxt.config.ts` and it is what makes the vertical budget honest. It also changes how users open the wallet, which is a product and distribution decision, not a layout one.
2. **What is the canonical mark size?** 80 (`logoSizeSmall`) is proposed as the median of the six in use and the one that survives the tightest budget. The welcome screen and the unlock screen are the two places a larger mark is arguably the point — unlock currently uses 140 on mobile.
3. **What does the throttled unlock state do?** Its notice is ~94-96 px, well past the 60 px `assist` band, and it appears on a screen the user is already failing on. Either `assist` grows for this one screen, or the notice moves into `body` above the field. (The mark's white-versus-salmon question is _resolved_: it is the hardcoded `#FCFCFC` inside `Logo.png`, not a choice — see above. FR-013 fixes it.)
4. **Does the primary action stay the topmost control in its stack, or become the bottom-most?** Making it bottom-most pins its Y for free, without reserving any empty band, and the recover screen already orders it that way. It is a visual-hierarchy decision the product owner should make, and it would shrink this change considerably.
5. **Where does the password strength meter live?** It does not fit `assist` alongside the terms line and the error messages. Moving it into `body`, directly under the field it describes, is proposed.
6. **Is `wallet.create.messageBody` shortened?** At 12-16 lines it does not fit any grid on the tightest surface. Shortening it is a copy change requiring both locales and product sign-off.
7. **Is `getAuthContainerStyles(contained = true)` dead**, or is that 380×760 card the extension's intended frame? No caller passes it today.
8. **Is `apps/mobile/app/(auth)/biometric.tsx` deleted?**
9. **Should `lock.title` be corrected to "Welcome back" on web and extension**, or is "Enter your password" the intended title and the mobile string the outlier? The two surfaces disagree today and one of them is wrong.
10. **Should web and extension gain a biometric unlock variant** (WebAuthn / passkey), or is the reserved biometric slot mobile-only? The extension already accepts and discards a cached-key unlock callback.

## Notes on process

- No branch was created. Spec-kit's `create-new-feature.sh` creates and switches branches; per instruction this work stays on `design/deep-water` and the spec was authored directly at `specs/013-onboarding-layout/spec.md`, following the single-`spec.md` shape every existing spec in `specs/` uses.
- Numbered 013 because `011-e2e-ci-and-prerelease` and `012-verification-round-2-gaps` already exist.
- No application code was changed by this spec.

## What was measured versus inferred

**Measured** — literal values read from source: every token; every `marginTop`/`marginBottom`/`padding`; every fixed control height (56 button, 56 input, 44 text button, 56 header); the derivable helper's 44 + 16 = 60; the action-stack arithmetic that produces 132 and 64; `Logo.png` at 197×183 in all three copies; `markViewBox` at 253×236; the shipped Chrome manifest's `action.default_popup`; the Playwright viewport at 360×600; `scaling.ts`'s caching with no invalidation; the absence of any `maxFontSizeMultiplier` in onboarding.

**Inferred** — resolved from flex centring, `marginTop: 'auto'` splits, or text wrapping that cannot be settled statically: absolute Y positions of centred blocks; line counts for every body and description string, and therefore their heights; the seed-grid card height; the resulting per-transition deltas for slots above the action. The action-slot deltas themselves are measured, because both sides are literal.

Also measured on the unlock screens: `lockScreenLogoSize` 140 and its `s()` product 124.09; the 45.91 pt button override; the `borderRadius.badge` 9 field; the forgot link's inherited 33.55 line-height; `Logo.png`'s baked `#FCFCFC`; `MARK_SIZE = 96` and `semantic.text.accent` on the loading screen; the `t('lock.title', 'Welcome Back')` defaultValue defect; and that `componentSizes.biometricButtonSize` (64) has zero call sites repo-wide.

**Not reached**: the two `useSecretScreen` screens could not be captured on device by design and were measured from source only. The reference screenshots cited in the request were not present on disk at the given paths; a Pixel 9 Pro capture of the "Unlocking Wallet" state was available and confirmed the loading mark renders from `markPaths` in salmon at roughly 96×88 dp, aspect 1.09 against `markAspectRatio` 1.072 — consistent with the source values. No screen was measured on a running web or extension build; every web and extension number is computed from source at a stated viewport and should be confirmed by the Playwright test in the test strategy before implementation locks the reserved heights.
