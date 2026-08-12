# Feature Specification: Launch screen

**Feature Branch**: `003-launch-screen`

**Created**: 2026-08-10

**Status**: Draft

**Input**: The app shows a branded splash (`splash-icon.png` over `#10131c`, `app.json:15-19`) before its first frame. Apple's Human Interface Guidelines ask that a launch screen resemble the app's first screen so startup feels instantaneous, and discourage using it as a branding surface. iOS requires _some_ launch screen — without one the app runs letterboxed at a reduced resolution — so the question is what it contains, not whether it exists.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open the wallet without a branded interstitial (Priority: P2)

A user taps the icon and the app appears to open directly into its first screen, with no logo card in between.

**Why this priority**: Cosmetic, and it competes with nothing. It is worth doing because it makes the app feel faster at zero runtime cost, and because it is one line in a build that is already being cut for specs 001 and 002. It is not worth its own release cycle.

**Independent Test**: Cold-launch the app on a device and observe the transition from the home screen to the first app frame.

**Acceptance Scenarios**:

1. **Given** the app is not running, **When** the user launches it, **Then** the pre-first-frame state is a plain background with no logo or text.
2. **Given** the app launches, **When** the first frame renders, **Then** there is no visible colour change between the launch state and the app background.
3. **Given** a device in either appearance mode, **When** the app launches, **Then** the launch background matches the app's own background rather than the system's.

---

### Edge Cases

- A cold launch on an older device, where the launch screen is visible long enough to read.
- A warm launch, where the launch screen may not appear at all.
- The app is launched into a deep link rather than the home tab.
- The launch background must not flash a different colour before the first frame paints.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST declare a launch screen; running without one is not an option, as iOS would letterbox the app.
- **FR-002**: The launch screen MUST NOT display a logo, wordmark, or any text.
- **FR-003**: The launch background MUST match the app's own background colour so the transition to the first frame is invisible.
- **FR-004**: The launch screen MUST be configured through `app.json`; native directories are generated and MUST NOT be edited.
- **FR-005**: Removing the splash image MUST NOT leave an orphaned asset in the repo, and MUST NOT break any other reference to that asset.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A cold launch shows no branded interstitial.
- **SC-002**: No visible colour change occurs between the launch state and the first rendered frame.
- **SC-003**: The app does not render letterboxed on any supported device.

## Assumptions

- Android is in scope for consistency, though its launch behavior differs and may need its own handling.
- `splash-icon.png` may be referenced elsewhere (store assets, marketing); its removal from the launch configuration does not imply deleting the file until that is checked.
- This is native config: it requires a prebuild and a new store binary, and is bundled with specs 001 and 002 into a single build.
- The app icon itself is out of scope and unchanged.
