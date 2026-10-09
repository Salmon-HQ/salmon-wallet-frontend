# Feature Specification: Salmon Wallet design system in Pencil

**Feature Branch**: `feat/041-pencil-design-system` (stacked on `feat/seeker-seed-vault`)

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Salmon Wallet design system in Pencil (pen.dev). Build a design source of truth that mirrors the shipped UI of the mobile app (Expo) and the browser extension, which share one design (packages/ui) except for platform-specific containers such as bottom sheets. Deliverables live in the private SOT repo under `03-dev/Design System/`: `Salmon.lib.pen` (tokens as Pencil variables with dark and light themes from packages/ui theme/cssVars and DESIGN.md; primitive and composite components from packages/ui/src/components, variants as `Group/Variant` components), `Salmon Screens.pen` (imports the library; layout templates for mobile screen, extension popup, and sheet/modal per platform; key flows: Onboarding, Home, Send, Receive, Swap, Settings), and a short `Design System.md` (SOT vault rules: English, frontmatter title/status/owner/reviewed, plain-language opening line). Method: inventory and classify components; audit runtime with Playwright (extension, headless) and Maestro (mobile simulator) to measure real spacing, alignment and sizing, because code can look right while using margins, fixed sizes or absolute positions where auto layout belongs; draw the correct auto-layout structure in Pencil and record each code-vs-structure difference as code debt in a findings report. Every component value comes from a variable. Out of scope: changing app code, screens beyond the key flows."

## Context

The wallet ships two apps — the mobile app and the browser extension — that are
twins on one design: every kit component and screen exists once per platform on
one shared contract, and only platform containers (bottom sheet vs. popup sheet,
navigation chrome) differ. Today the design lives only in code and in
`DESIGN.md`. There is no visual source of truth a designer, the owner or a
reviewer can open, compare against the running apps, or draw the next change in.

This feature builds that source of truth in Pencil. It is a **description of
what ships**, drawn with the structure it should have; where the code reaches
the right picture through the wrong structure, the drawing keeps the right
structure and the difference becomes a recorded piece of code debt.

The design files are private: they will hold designs of unreleased changes, and
this frontend repository is public. Only this spec and its plan/tasks live here.

## Clarifications

### Session 2026-10-09

- Q: On which platforms is each key flow drawn? → A: Mobile in full for every key flow; the extension gets only its container deltas (popup frame, and the sheets/modals that differ from mobile).
- Q: How are signature materials Pencil cannot reproduce exactly represented? → A: Native approximation with Pencil gradients, background blur and shadows, each labelled with the code that renders the real material; motion is recorded as a note, not animated. No scripts or GLSL shaders.
- Q: Which code state is "shipped"? → A: `main` at a recorded commit plus a named list of in-flight branches (e.g. the SKR redesign 040, Seeker work); each branch's UI is drawn from that branch.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - One library of tokens and components the team can build from (Priority: P1)

The owner (or a designer working for them) opens the Salmon library and finds
every design token — colour, spacing, radius, typography, elevation, motion where
expressible — as a named variable with a dark and a light value, and every
shipped kit component drawn from those variables, with each variant as its own
named component (`Button/Primary`, `Button/Ghost`, …). Switching the theme on a
frame flips every component between deep-water dark and light without touching
a single node.

**Why this priority**: Everything else (templates, flows, the findings) is
built from the library. Without it the screens are drawings of numbers, not of
the system, and they drift the first time a token changes.

**Independent Test**: Open only the library file; switch a board holding every
component between the two themes; run a lint that walks every component and
reports any raw colour, spacing, radius or type value not bound to a variable.
Delivers value alone: a reviewable kit even before any screen exists.

**Acceptance Scenarios**:

1. **Given** the library file, **When** the theme axis is set to light on a board holding every component, **Then** every component renders with its light values and no node keeps a dark-only literal.
2. **Given** any token in the shipped theme source, **When** the reviewer looks it up in the library, **Then** a variable with the same name path exists with a value for each theme that matches the code.
3. **Given** any shipped kit component with visible variants, **When** the reviewer browses the library, **Then** each variant exists as a `Group/Variant` component, and states that differ only in text or icon are overrides, not separate components.
4. **Given** the library, **When** the value lint runs, **Then** it reports zero unbound values, except the documented exceptions (see FR-006).

---

### User Story 2 - Layout templates per platform container (Priority: P2)

A person drawing a new screen starts from a template that already carries the
right frame for the target: a mobile screen, an extension popup, and a sheet or
modal for each platform. The template fixes the outer size, safe areas, header,
content scroll region and bottom action area with auto layout, so a new screen
inherits correct spacing instead of guessing it.

**Why this priority**: The twins differ mainly in containers; drawing those once
is what lets one flow be drawn for both platforms without redrawing the inside.

**Independent Test**: Instantiate each template, drop a library component into
its content slot, and verify the content stretches and spaces correctly at the
template's sizes without manual positioning.

**Acceptance Scenarios**:

1. **Given** the screens file, **When** a person instantiates the mobile-screen, extension-popup, mobile-sheet and extension-sheet templates, **Then** each exposes named slots (header, content, actions) and contains no absolutely positioned node other than real overlays.
2. **Given** a template's measured dimensions, **When** compared with the runtime measurement of the same container, **Then** outer size, safe-area insets and paddings match within 1px.

---

### User Story 3 - Key flows drawn from the library (Priority: P2)

The owner can walk the six key flows — Onboarding, Home, Send, Receive, Swap,
Settings — as boards built only from library instances inside the templates, in
both themes, and compare each board side by side with a screenshot of the
running app.

**Why this priority**: The flows are where the system proves it describes the
real product, and they are the starting canvas for the next redesign.

**Independent Test**: For each flow, place the board next to its runtime
screenshot; every visible element is a library instance or text, and the two
match within the stated tolerance.

**Acceptance Scenarios**:

1. **Given** a key-flow board, **When** inspected, **Then** every visible element is a library instance, a template, or text bound to typography variables — no detached copies of components.
2. **Given** a key-flow board and the runtime screenshot of the same state, **When** compared, **Then** positions and sizes of each element match within 2px, or the difference is listed in the findings report.

---

### User Story 4 - Findings report: where code structure and design structure disagree (Priority: P3)

A developer reads a findings report listing, per component or screen, each place
where the shipped code achieves its look with a margin, fixed size, absolute
position or magic number where auto layout (gap, padding, fill, fit) belongs —
with the measured runtime value, the structure drawn in Pencil, the file in code
and a suggested fix. They can pick items up as code-debt tickets without
re-auditing.

**Why this priority**: It is the payoff of drawing structure instead of copying
shortcuts, but it is useful only once the library and flows exist.

**Independent Test**: Pick three findings at random; each one reproduces in the
running app and in the code location it names.

**Acceptance Scenarios**:

1. **Given** a finding, **When** a developer opens the code location it names, **Then** the structure described is there, and the runtime measurement it cites can be reproduced.
2. **Given** a component where both twins agree with the drawn structure, **Then** it produces no finding; **Given** the twins disagree with each other, **Then** that is recorded as its own finding.

---

### User Story 5 - A short note that explains how to use it (Priority: P3)

Anyone opening the SOT finds `Design System.md`: one plain-language opening line
saying what the design system is, where the files are, how they relate to the
code, how to keep them in sync, and what is deliberately not in them.

**Why this priority**: Without it the files are discoverable only by those who
built them.

**Independent Test**: The note passes the SOT vault rules (English, frontmatter
`title`/`status`/`owner`/`reviewed`, plain-language opening line).

**Acceptance Scenarios**:

1. **Given** the note, **When** checked against the SOT vault rules, **Then** it passes, and every file it names exists at the path it gives.

---

### Edge Cases

- A component exists on one platform only (a mobile-only or DOM-only entry in the parity maps): it is drawn once, labelled with its platform, and never invented for the other.
- The two twins of a component render differently at runtime although they share a contract: the drawing follows the shared contract and `DESIGN.md`, and the divergence is a finding.
- A visual Pencil cannot express natively (the water column depth ramp, scales motif, flesh texture, thermocline blur, animated states): approximated natively and labelled per FR-012; the gap between approximation and runtime is not a finding.
- The same screen differs between `main` and an in-flight branch: the branch version is drawn and labelled with the branch; the `main` version is not drawn twice.
- A token whose value is a size bound to width/height (which the Pencil CLI drops): the node carries the token's number and the variable name is recorded beside it, so the lint knows it is bound by convention.
- Colours with alpha in code (`rgba(...)`): stored as `#RRGGBBAA` variables, never as literals.
- A shipped state reachable only with live funds or a live backend (a pending transaction, a swap quote): drawn from demo data; the runtime capture uses a test wallet and never real funds.
- Text that changes length by language: flows are drawn in English; the findings note any container that clips Spanish copy if seen in the audit.
- The library is edited while a screens file is open in the app: the one-writer rule applies — one writer per file at a time.

## Requirements _(mandatory)_

### Functional Requirements

**Library (`Salmon.lib.pen`)**

- **FR-001**: The library MUST define every design token of the shipped theme (the shared theme source, as projected for the DOM kit, and as described in `DESIGN.md`) as a variable whose name follows the token's path, with a dark and a light value.
- **FR-002**: Variables MUST keep the alias chain the code has (component → semantic → primitive) instead of flattening it to raw values.
- **FR-003**: The library MUST contain every shipped kit component used by the key flows, classified as primitive (no other kit component inside) or composite (built from library instances).
- **FR-004**: Each visible variant MUST be its own component named `Group/Variant`; differences of text or icon only MUST be instance overrides.
- **FR-005**: Every component MUST be built with auto layout; absolute positioning is allowed only for real overlays (badges, scrims, floating actions).
- **FR-006**: Every colour, gap, padding, radius, opacity and typography value MUST come from a variable. Width/height values the tool cannot bind MUST be the token's number with the variable recorded beside it. A lint MUST report any other unbound value.
- **FR-007**: Component-specific measurements (a control height, an avatar size) MUST be component tokens, not repeated numbers.

**Screens (`Salmon Screens.pen`)**

- **FR-008**: The screens file MUST import the library and use only its components and variables — no local copies of library components.
- **FR-009**: It MUST provide layout templates for: mobile screen, extension side panel (the surface the toolbar opens — what this spec calls the extension "popup"), the extension's dApp-approval popup window, mobile sheet/modal, extension sheet/modal — each with named slots and the runtime-measured outer size and insets.
- **FR-010**: It MUST draw the key flows Onboarding, Home, Send, Receive, Swap and Settings, covering each flow's main path states as shipped. Mobile is drawn in full for every flow; the extension is drawn only where its container differs (the popup frame, and the sheets/modals that differ from mobile), reusing the mobile content inside the extension templates.
- **FR-011**: Each flow board MUST be viewable in both themes by switching the theme on the board, not by duplicating it.
- **FR-012**: Signature materials that Pencil cannot reproduce exactly (water column, scales, flesh texture, thermocline, motion) MUST be represented with Pencil's native means only — gradients, background blur and shadows, all bound to variables — each carrying a label that names the code rendering the real material. Motion is recorded as a note on the board, not animated. Scripts and shaders are not used.

**Audit and findings**

- **FR-013**: Before a component or template is drawn, its real spacing, alignment and size MUST be measured in the running app — the extension in a headless browser and the mobile app on a simulator — and the measurement kept with the finding or the component.
- **FR-014**: Every difference between the code's structure and the drawn auto-layout structure (margins instead of gap/padding, fixed sizes instead of fill/fit, absolute positions instead of flow, literals instead of tokens, twin divergence) MUST be recorded in a findings report with: component/screen, platform, code location, runtime measurement, drawn structure, suggested fix and severity.
- **FR-015**: The audit MUST NOT change app code, and MUST NOT use real seed phrases, keys or funds; captures use test wallets per the repo's secret rules.

**Documentation and location**

- **FR-016**: All design files, the findings report and `Design System.md` MUST live in the private SOT repo under `03-dev/Design System/`; nothing from them is committed to this public repo except this spec, plan and tasks.
- **FR-017**: `Design System.md` MUST follow the SOT vault rules: English, frontmatter `title`/`status`/`owner`/`reviewed`, a plain-language opening line, and a short "how to keep it in sync with code" section.
- **FR-018**: The baseline the design mirrors MUST be one fixed, named code state, recorded in `Design System.md`: `main` at a recorded commit plus a named list of in-flight branches. Each in-flight branch's UI is drawn from that branch and labelled with it; everything else is drawn from `main`. Changing the baseline means updating that record.

  Baseline confirmed by the owner on 2026-10-09:
  - `main`: `origin/main` at `31cd6541d039571aaa95d3ae716a46decffe4371` (2026-10-07).
  - In-flight: `feat/seeker-seed-vault` at `137d6751` — Seed Vault accounts, Staking in Assets and the SKR Powerup, the frozen-NFT notice, the Mobile Wallet Adapter dApp approval it carries from `feat/seeker-dapp-store`, and the 040 SKR redesign (Pill, ProgressBar and StatTile kit components; BlockList and SectionLabel changes).
  - Excluded as stale: `feat/query-settlement`, `feat/solana-actions-blinks-stake`. `feat/seeker-dapp-store` on origin is left as is; its UI is read from `feat/seeker-seed-vault`.

### Key Entities

- **Token (variable)**: a named design value with one value per theme; aliases another token or holds a primitive; maps 1:1 to a token path in code.
- **Component**: a reusable drawn element, primitive or composite, with a `Group/Variant` name, a platform scope (both, mobile-only, extension-only) and the code component(s) it mirrors.
- **Layout template**: a platform container (screen, popup, sheet/modal) with fixed outer measurements and named slots.
- **Flow board**: one state of a key flow, built from templates and component instances, viewable in both themes.
- **Runtime measurement**: a measured size/spacing/position of an element in the running app, with platform, screen and date.
- **Finding**: one code-vs-structure difference, linking a component or screen, a code location, a runtime measurement, the drawn structure, a suggested fix and a severity.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of colour, spacing, radius and typography values in the library are bound to variables (lint reports 0 unbound, outside the documented width/height exception).
- **SC-002**: 100% of theme tokens in the code baseline have a matching variable with both theme values, and 100% of the kit components used by the key flows exist in the library.
- **SC-003**: Every key-flow board matches its runtime screenshot within 2px per element, or each deviation is listed in the findings report.
- **SC-004**: Switching a board between dark and light changes its look with zero manual edits.
- **SC-005**: Three findings chosen at random are each reproducible by a developer in under 10 minutes from the information in the report alone.
- **SC-006**: A person new to the files can start a new screen from a template and place three library components in under 5 minutes, using only `Design System.md` as guidance.
- **SC-007**: Zero files from the design system are present in the public repo, and zero lines of app code change as part of this feature.

## Assumptions

- The theme source of truth is `packages/shared/src/theme` (as projected to the DOM kit's CSS variables); `DESIGN.md` explains intent and wins only where it names a rule the code does not encode — any disagreement is a finding, not a silent pick.
- "Twins share one design": the drawing is one component per shared contract; platform-specific containers and the mobile-only / DOM-only entries in the parity maps are the only platform splits.
- Page-level composites (Send page, Swap page, Settings panels) are drawn as screens in the flows, not as library components; the library holds the kit pieces they are built from.
- Flows are drawn in English with demo data; Spanish is out of scope for the drawings.
- Swap shipped on `main` (extension 0.17.0), so its board is drawn from `main` unless a later in-flight branch changes it.
- Pencil limitations follow the `pencil-pen-dev` skill as tested on pen CLI 0.3.11 (no variant system, no stretch, `#RRGGBBAA` alpha, width/height variables dropped, libraries via `.lib.pen` + import).
- The pen CLI and/or the Pencil app are available with a logged-in account; logging in, saving in the app and installing fonts are done by the owner.
- The existing E2E suites (`apps/extension/.playwright`, `apps/mobile/.maestro`) and their test-wallet setup are reused for runtime capture; no new committed tests are required by this feature.
- The findings report feeds code-debt tickets later; filing them in Linear is not part of this feature.

## Out of Scope

- Changing app code, tokens or `DESIGN.md` (findings only).
- Screens beyond the six key flows (Activity, NFTs, Powerups catalogue, Staking/SKR, dApp approval, etc.).
- Interactive prototyping and motion specs beyond static states.
- Generating code from the design.
