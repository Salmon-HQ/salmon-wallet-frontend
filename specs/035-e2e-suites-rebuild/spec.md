# Feature Specification: End-to-end suites rebuilt on the definitive layout

**Feature Branch**: `feat/powerups-foundations` (spec dir `035-e2e-suites-rebuild`)

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: User description: "Rebuild the end-to-end suites of both apps against the current, definitive layout: the Maestro suite of apps/mobile and the Playwright suite of apps/extension (`tests/*.spec.ts` and the legacy `scripts/*.mjs` drivers). Anchor on stable testIDs so the suites survive new Powerups or buttons. Every selector exists in the current app; every intermediate screen is handled deterministically; a preflight fails fast with a named cause; no fixed sleeps; a static audit of every selector runs in CI. No pull requests, no EAS builds, seeds never printed, state-modifying flows on devnet only. Update the global Maestro and Playwright skills with the traps found."

## Why this exists

The suites were written against layouts that no longer exist. A walk on
2026-09-23 lost most of its time to the tooling rather than the app: a flow
waited three minutes on a "Congratulations" screen it never expected, the
Expo SDK 57 dev launcher had no server row to tap, a receive-sheet check
asserted an element the sheet stopped rendering, and a Home walk waited for a
"My Collectibles" heading and a Powerups screen that are gone. Each of those
reads as "the app is broken" until someone looks, which is the most expensive
kind of failure a test suite can produce.

The layout is now definitive. What will change later is additive — a new
Powerup, a new button — so this is the moment to rebuild the suites once, on
anchors that do not move, with a guard that stops them drifting again.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A run either tests the app or says exactly why it cannot (Priority: P1)

The owner (or an agent) starts a mobile or extension run. Before any flow
touches the app, a preflight checks that everything the run needs is present
and answers within seconds, naming the missing piece when one is absent.

**Why this priority**: every hang yesterday was a missing precondition that
surfaced minutes later as a selector failure.

**Independent Test**: stop each prerequisite in turn (device, port mapping,
backend, bundler, installed build) and start a run; each attempt ends within
30 s with a message naming that prerequisite.

**Acceptance Scenarios**:

1. **Given** the backend is down, **When** a run starts, **Then** it stops before launching the app and says the backend is unreachable at its address.
2. **Given** the bundler is up but has not built the bundle yet, **When** a run starts, **Then** the preflight builds it first, so the first flow does not wait on it.
3. **Given** the installed app is built for a different platform release than the checkout, **When** a run starts, **Then** it stops and says which build is installed and which is expected.

---

### User Story 2 - Every flow runs start to finish on the current app without a human (Priority: P1)

Each smoke and action flow on mobile, and each spec on the extension, reaches
its end on the current app with no manual tap, across the screens a real
session passes through: the development launcher, recovery, the success
screen, the analytics consent, an optional biometric prompt, and the lock.

**Why this priority**: a flow that needs a person in the middle is not a test.

**Independent Test**: run the full smoke suite unattended on an Android
emulator and the extension suite in its browser; no run stops for input.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the recovery subflow runs, **Then** it passes the success screen and the consent screen whichever of them appears, and ends on Home.
2. **Given** the definitive layout, **When** any flow selects an element, **Then** the element exists in the current app (no selector refers to a removed screen, heading or element).
3. **Given** a flow that taps a control, **When** it runs, **Then** it targets the control by its stable identifier, never by screen coordinates.

---

### User Story 3 - The suites cannot silently drift again (Priority: P2)

When someone renames or removes an element a flow depends on, the repository's
checks fail on that change and name the flow and the selector, before any
device run.

**Why this priority**: drift is how the suites got here; a guard that runs with
every other check is cheaper than rebuilding them again.

**Independent Test**: rename one identifier a flow uses; the checks fail
naming the flow file, the line and the missing identifier.

**Acceptance Scenarios**:

1. **Given** a flow references an identifier that no component renders, **When** the repository checks run, **Then** they fail naming the flow, the line and the identifier.
2. **Given** a new Powerup adds a button, **When** the checks run, **Then** nothing fails: existing flows keep passing without edits.

---

### User Story 4 - The next agent does not relearn the traps (Priority: P3)

The global guidance for mobile and browser end-to-end testing records the
traps found in this work, so any later session on any project avoids them.

**Why this priority**: useful beyond this repository, but it protects future
work rather than this run.

**Independent Test**: the guidance names each trap listed in the input, with
the fix.

**Acceptance Scenarios**:

1. **Given** the mobile testing guidance, **When** read, **Then** it covers the SDK 57 dev launcher deep link, the monorepo bundle path, the post-recovery screens and host memory pressure.

---

### Edge Cases

- A flow runs against mainnet data it does not own (a named NFT in the owner's wallet): it must depend only on test wallets, or be marked as a capture tool rather than a test.
- The machine is under memory pressure and Android shows "isn't responding": the run reports it as an environment failure, not an app failure.
- Two runs start at once against one device: the second refuses rather than failing on a busy port.
- A flow that moves funds or NFTs is started against a non-devnet network: it refuses to run.
- Legacy extension drivers that only capture screenshots for the stores are tools, not tests; they stay outside the suite and are not counted as coverage.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every selector in both suites MUST resolve to an element the current app renders; selectors on removed screens, headings or elements MUST be replaced or removed.
- **FR-002**: Flows MUST target controls by stable identifier; coordinate taps MUST be eliminated, adding identifiers to components where one is missing.
- **FR-003**: Localised text MUST NOT be the anchor of a flow step except where asserting copy is the point of the step.
- **FR-004**: The shared subflows for onboarding and recovery MUST handle each intermediate screen (development launcher, success, consent, biometric prompt, lock) deterministically, waiting on a condition, never a duration.
- **FR-005**: Each suite MUST have a preflight that verifies device or browser readiness, port mapping, backend, bundler with the bundle already built, and the installed build's platform release, and MUST stop within 30 s naming the first missing prerequisite.
- **FR-006**: Fixed-duration waits MUST be replaced by condition waits, except where a duration is the thing under test.
- **FR-007**: A static audit MUST check every selector of both suites against the current source and copy, MUST run with the repository's other checks, and MUST fail naming flow, line and selector.
- **FR-008**: State-modifying flows MUST refuse to run against any network other than devnet and MUST keep running last in their orchestrator.
- **FR-009**: Seeds, private keys and passwords MUST never be printed by the suites, their runners or their logs; logs that record typed text MUST stay out of the repository.
- **FR-010**: The legacy extension drivers MUST be classified: behaviour checks become specs in the suite; capture tools are kept apart and documented as tools; obsolete drivers are deleted.
- **FR-011**: The global mobile and browser end-to-end testing guidance MUST record the traps listed in the input with their fixes.
- **FR-012**: The suites' own documentation MUST state how to run them and what each covers, matching the rebuilt contents.

### Key Entities

- **Flow / spec**: one user scenario, its steps anchored on identifiers.
- **Subflow / helper**: a shared building block (onboard, recover, unlock, navigate).
- **Preflight**: the gate that decides whether a run may start.
- **Selector audit**: the check that ties every selector to the current source.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 0 selectors in either suite fail the static audit.
- **SC-002**: The mobile smoke suite and the extension suite each complete unattended, with 0 manual interventions, on the definitive layout.
- **SC-003**: With any single prerequisite missing, a run stops within 30 s naming it (5 of 5 prerequisites checked).
- **SC-004**: 0 coordinate taps and 0 fixed sleeps remain outside steps that test timing.
- **SC-005**: Renaming one identifier a flow uses makes the repository checks fail, naming it, without starting a device.

## Assumptions

- Work stays on `feat/powerups-foundations`, committed and pushed, with no pull request; the spec-kit branch hook is not run.
- Android verification uses the local emulator; iOS runs wait for the owner's macOS and Xcode update; no EAS builds while the App Store review is pending.
- State-modifying flows use the devnet test wallets from the suites' local env files; mainnet is read-only.
- Store-capture drivers stay available as tools; they are not part of the pass/fail suite.
- The layout is definitive; later changes are additive (new Powerups, new buttons).
