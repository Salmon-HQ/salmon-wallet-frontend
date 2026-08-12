# Feature Specification: Withdrawing analytics consent

**Feature Branch**: `005-analytics-consent-withdrawal`

**Created**: 2026-08-10

**Status**: Draft

**Input**: App Review Guideline 5.1.1(ii) requires apps that collect usage data to secure consent "even if such data is considered to be anonymous", and to provide "an easily accessible and understandable way to withdraw" it. The app asks for analytics consent during onboarding and proxies events to GA4 through its own backend. What is not established is whether a user who accepted can later change their mind from inside the app.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Turn analytics off after having accepted (Priority: P1)

A user who accepted analytics during onboarding later opens settings, finds the control, turns it off, and no further events are sent.

**Why this priority**: This is a submission blocker of the same kind as a missing privacy policy — it is checkable by a reviewer in under a minute and does not depend on the app working well. It is also the only one of Apple's compliance requirements that is code rather than a console form.

**Independent Test**: Accept during onboarding, then turn the setting off, then exercise flows that would normally emit events and confirm none leave the device.

**Acceptance Scenarios**:

1. **Given** a user who accepted analytics, **When** they open settings, **Then** a control to turn analytics off is present without hunting.
2. **Given** analytics is on, **When** the user turns it off, **Then** no further events are sent for the rest of the session and after a restart.
3. **Given** analytics is off, **When** the user turns it back on, **Then** collection resumes.
4. **Given** the user declined during onboarding, **When** they open settings, **Then** the control reflects that state rather than defaulting to on.
5. **Given** analytics is off, **When** the app is reinstalled, **Then** the user is asked again rather than silently re-enrolled.

---

### User Story 2 - Understand what is collected before deciding (Priority: P2)

A user reads, next to the control, what the data is and what it is not.

**Why this priority**: 5.1.1(ii) requires the withdrawal route to be "understandable", not merely present, and a toggle labelled only "Analytics" does not tell a wallet user whether their addresses or balances are involved. Existing copy already claims no addresses are included; that claim must sit where the decision is made.

**Independent Test**: Read the settings screen cold and answer: what is sent, and is anything about my funds included.

**Acceptance Scenarios**:

1. **Given** the settings screen, **When** the user reads the analytics section, **Then** it states in plain language what is collected and explicitly that wallet addresses are not.

---

### Edge Cases

- Events queued or in flight at the moment consent is withdrawn.
- Analytics disabled while the app is offline and events are buffered.
- The user never answered the onboarding prompt because they skipped it or upgraded from a version that predates it.
- Consent state and its storage must survive a restart but not survive a reinstall.
- Crash and diagnostic reporting, if any, is a separate consent from product analytics and must not be conflated with it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A user MUST be able to withdraw analytics consent from within the app at any time, without contacting support.
- **FR-002**: The control MUST be reachable from the app's own settings, not buried behind an external link.
- **FR-003**: Withdrawing consent MUST stop event transmission immediately, including anything already queued.
- **FR-004**: Consent state MUST persist across restarts and MUST be the single source of truth consulted before any event is sent.
- **FR-005**: The control MUST show the user's actual current state, never a default that contradicts their onboarding answer.
- **FR-006**: The copy MUST state what is collected and explicitly that wallet addresses are excluded.
- **FR-007**: All copy MUST exist in English and Spanish.
- **FR-008**: The behavior MUST be covered by a test asserting that no event is emitted while consent is withdrawn.
- **FR-009**: The app's privacy policy MUST be reachable from within the app, and MUST describe this withdrawal route. [Shared with spec 006.]

### Key Entities

- **Analytics consent**: a persisted, per-install decision with three meaningful states — accepted, declined, and never asked — that gates every outbound event.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A reviewer can find and use the withdrawal control without instructions.
- **SC-002**: Zero analytics events leave the device while consent is withdrawn, verified by test rather than by inspection.
- **SC-003**: The consent state shown in settings always matches the state the app actually enforces.
- **SC-004**: Turning analytics off degrades no other feature.

## Assumptions

- Analytics events are already gated somewhere; this spec expects to extend one existing gate rather than introduce a second one. If more than one gate exists, consolidating them is in scope.
- The backend proxy means the client IP never reaches the analytics provider. That is a privacy property worth stating in the copy, but it does not remove the consent obligation: data still leaves the device.
- This is JavaScript and ships over the air.
- The App Privacy declarations in App Store Connect are a separate obligation and belong to spec 006.
