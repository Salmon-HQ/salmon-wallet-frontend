# Feature Specification: App Store submission readiness

**Feature Branch**: `006-app-store-submission`

**Created**: 2026-08-10

**Status**: Draft

**Input**: The app runs in TestFlight. Internal TestFlight builds bypass App Review entirely, so a working build proves the binary runs and nothing else. This spec captures the obligations that can block publication independently of whether the app works, and the one question that will actually decide the review.

**Owner**: This is console and paperwork rather than code. It is written down so nothing is lost between the people doing it.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pass the console gates that block submission (Priority: P1)

The team completes the declarations App Store Connect requires before a submission can even be started.

**Why this priority**: These block earlier than review does — an unanswered age-rating questionnaire or an undeclared trader status stops the submission before a human sees the app. They are also the items most likely to be overlooked, because none of them relates to the product.

**Independent Test**: Attempt to start a submission; the console either accepts it or names what is missing.

**Acceptance Scenarios**:

1. **Given** Apple's 2025 age-rating questionnaire, **When** the app record is opened, **Then** it is answered. Its deadline has passed, and until it is answered the console blocks updates.
2. **Given** the EU Digital Services Act trader requirement, **When** the developer account is checked, **Then** trader status is declared and verified for the legal entity. Apps without it are removed from the EU store.
3. **Given** the listing metadata, **When** it is reviewed, **Then** the privacy policy URL and the support URL are present and resolve.
4. **Given** the App Privacy declarations, **When** they are completed, **Then** they reflect what actually leaves the device, including the analytics provider and every third-party API the app calls.
5. **Given** the export compliance answer, **When** it is re-checked, **Then** it accounts for the app shipping standard cryptography that is not provided by the operating system, and the French declaration is filed if France is a listed territory.

---

### User Story 2 - Give the reviewer what they need to test a wallet (Priority: P1)

A reviewer opens the app and can complete a swap and a bridge without obtaining crypto themselves.

**Why this priority**: Equal to P1 above. "The reviewer could not test it" is one of the most common rejections for this class of app, and it is entirely self-inflicted: an empty wallet cannot swap. Apple's own guidance is explicit about including demo credentials and turning the backend on.

**Independent Test**: Hand the review notes and the test wallet to someone who has never seen the app and ask them to complete a swap.

**Acceptance Scenarios**:

1. **Given** the review notes, **When** a reviewer follows them, **Then** they can restore a funded test wallet and complete both a swap and a bridge.
2. **Given** the review notes, **When** a reviewer reads them, **Then** they state that the app is non-custodial, that keys never leave the device, and that there are no user accounts.
3. **Given** guideline 2.3.1(a)'s requirement that notes describe changes specifically, **When** the notes are reviewed, **Then** they contain no generic descriptions.

---

### User Story 3 - Answer the crypto-exchange question before it is asked (Priority: P1)

The team has a written answer to why a swap and a bridge are not an unlicensed exchange, and a territory list it can defend.

**Why this priority**: This is the question that decides the outcome. Guideline 3.1.5(iii) permits facilitating cryptocurrency transactions "on an approved exchange" and only where the app holds "appropriate licensing", and defines neither term. Two documented cases of non-custodial apps — both with _less_ exchange-like surface than a Jupiter swap plus a cross-chain bridge — were rejected and asked for licensing evidence covering every territory they shipped to.

**Independent Test**: Read the prepared answer as if you were a reviewer who has just asked "what licenses do you hold, and where".

**Acceptance Scenarios**:

1. **Given** the territory list, **When** it is reviewed, **Then** it contains only markets the company can defend in writing, rather than the worldwide default.
2. **Given** the review notes, **When** a 3.1.5(iii) question arrives, **Then** the answer already exists: non-custodial architecture, on-chain routing signed locally by the user, the third-party bridge provider's own licensing posture, and why no KYC is performed.
3. **Given** mainland China, **When** the territory list is set, **Then** it is excluded.

---

### Edge Cases

- The app is left available worldwide by default, which asserts to Apple that the company holds appropriate licensing in every one of the 175 storefronts.
- A reviewer mistakes creating a wallet for creating an account and asks for in-app account deletion under 5.1.1(v). The rule is triggered by account creation, and this app has none — but the notes should say so rather than rely on the reviewer inferring it.
- The App Privacy declarations understate what third-party APIs receive, which becomes a metadata-accuracy problem rather than a privacy one.
- Screenshots show a feature or a balance that the submitted build does not produce.
- The seller name shown on the product page is not the legal entity.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every App Store Connect declaration that blocks submission MUST be completed before a submission is attempted.
- **FR-002**: The territory list MUST be a deliberate, defensible choice, not the default.
- **FR-003**: Review notes MUST include credentials for a funded test wallet sufficient to complete a swap and a bridge.
- **FR-004**: Review notes MUST state the non-custodial architecture and the absence of user accounts.
- **FR-005**: Review notes MUST pre-empt the 3.1.5(iii) licensing question.
- **FR-006**: The privacy policy MUST be reachable both from the listing and from inside the app. [Shared with spec 005.]
- **FR-007**: App Privacy declarations MUST match what the app actually transmits, including every third-party service.
- **FR-008**: Screenshots and description MUST reflect the submitted build.
- **FR-009**: The export compliance answer MUST be verified against the cryptography the app actually ships rather than assumed.
- **FR-010**: The version string on the App Store Connect record MUST match the build being submitted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A submission can be started with no console field blocking it.
- **SC-002**: A reviewer can complete every advertised transaction flow using only the review notes.
- **SC-003**: Every listed territory has a written justification.
- **SC-004**: No rejection arrives for a reason that was known and documented in advance.

## Assumptions

- The Apple account is an Organization, which guideline 3.1.5(i) makes a hard requirement for a wallet and which is already satisfied.
- The app is free with no in-app purchases, so the paid-apps agreement and banking details do not apply.
- Guideline 5.1.1(v) account deletion does not apply, because the app creates no accounts. This is stated in the notes as insurance, not because the rule is thought to bite.
- The privacy manifest requirement is already satisfied — it is enforced at upload, and builds are processing.
- The swap referral commission is a server-side rebate rather than a payment from the user inside the app, and therefore not in-app-purchase territory. No Apple guideline addresses this directly; the reasoning is recorded here so it can be defended rather than re-derived.
- Legal questions — territory licensing, MiCA scope for the bridge, US registration — are for counsel and the tech lead. This spec records that they are open, not how to answer them.
