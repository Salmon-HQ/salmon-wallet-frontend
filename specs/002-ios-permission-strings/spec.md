# Feature Specification: iOS permission purpose strings

**Feature Branch**: `002-ios-permission-strings`

**Created**: 2026-08-10

**Status**: Draft

**Input**: The shipped binary carries three purpose strings, none written by the team — all are Expo config-plugin defaults interpolating the sanitized target name. Verified in `salmon-wallet-1.0.2-3-2026-08-10.ipa`:

```
NSCameraUsageDescription      "Allow SalmonWallet to access your camera"
NSFaceIDUsageDescription      "Allow SalmonWallet to use Face ID"
NSMicrophoneUsageDescription  "Allow SalmonWallet to access your microphone"
```

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand why the wallet wants my face (Priority: P1)

A user enabling biometric unlock during onboarding reads the system dialog and learns what Face ID will actually be used for before deciding.

**Why this priority**: This is the single most-seen dialog of the three, it appears while the user is deciding how much to trust a piece of software that will hold their money, and the current text is a tautology — the dialog header already says the app wants Face ID, so the body adds nothing. Apple's LocalAuthentication documentation states the string "should clearly explain **why** your app needs access", and guideline 5.1.1(ii) requires purpose strings to "clearly and completely describe your use of the data". The current string fails both.

**Independent Test**: Install a build, reach the biometric step, read the dialog. The body must state the purpose, not restate the request.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the Face ID dialog appears, **Then** its body explains that Face ID unlocks the wallet and authorizes transactions.
2. **Given** any permission dialog from this app, **When** the user reads it, **Then** the product name in the body matches the name on the home screen.
3. **Given** the built binary, **When** its `Info.plist` is inspected, **Then** `NSFaceIDUsageDescription` is present — its absence would stop iOS allowing Face ID at all.

---

### User Story 2 - Understand why the wallet wants the camera (Priority: P2)

A user tapping the scan control reads a dialog that names QR scanning as the reason.

**Why this priority**: Behind Face ID only because it is seen less often. It becomes real the moment spec 001 ships; until then there is no camera prompt to read.

**Independent Test**: Reach the scan control, read the dialog body, confirm it names QR scanning.

**Acceptance Scenarios**:

1. **Given** the send screen, **When** the user taps scan for the first time, **Then** the dialog explains the camera reads QR codes for wallet addresses.

---

### User Story 3 - Never be asked for the microphone (Priority: P2)

A user is never shown a microphone prompt, and the app does not declare that it might want one.

**Why this priority**: The app has no audio feature and no code path that touches the microphone. Guideline 5.1.1(iii) asks that apps "only request access to data relevant to the core functionality", and 5.1.1(iv) gives the near-identical example of a photo-posting app that must not require microphone access. A wallet asking for a microphone is a question with no honest answer.

**Independent Test**: Inspect the built `Info.plist`; the key must be absent. Then upload that build to App Store Connect and confirm processing succeeds.

**Acceptance Scenarios**:

1. **Given** the built binary, **When** its `Info.plist` is inspected, **Then** `NSMicrophoneUsageDescription` is absent.
2. **Given** that binary, **When** it is uploaded to App Store Connect, **Then** processing completes without ITMS-90683.
3. **Given** processing fails with ITMS-90683, **When** the key is restored with a string that states no audio is recorded, **Then** processing succeeds and the deviation is recorded in this spec.

---

### Edge Cases

- Apple's upload validator scans the linked binary for protected-API symbols and demands a purpose string even for APIs the app never calls: *"While your app might not use these APIs, a purpose string is still required."* Removing the microphone key may therefore be rejected at upload rather than at review. This is empirically determined per build and MUST be tested before submission, not during review.
- Two installed plugins declare a default for `NSFaceIDUsageDescription` (`expo-local-authentication` and `expo-secure-store`). Only one value survives, and precedence is first-writer-wins across plugin ordering. An override must be applied such that the intended string wins regardless of which plugin runs first.
- A value placed in `ios.infoPlist` can change a permission string but can never delete the key; only the plugin option can remove it.
- The keychain read raises a second user-visible string, `authenticationPrompt`, which lives in application code rather than config and is not covered by changing `Info.plist`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every purpose string in the shipped binary MUST state what the capability is used for, not restate the request.
- **FR-002**: Every purpose string MUST spell the product name the way the home screen does.
- **FR-003**: Purpose strings MUST follow Apple's stated form: a brief complete sentence, sentence case, ending in a period.
- **FR-004**: `NSFaceIDUsageDescription` MUST be present and MUST be the intended string irrespective of plugin ordering.
- **FR-005**: `NSCameraUsageDescription` MUST name QR scanning as the purpose.
- **FR-006**: `NSMicrophoneUsageDescription` MUST be absent, unless the upload validator demands it, in which case it MUST state that the app does not record audio.
- **FR-007**: Strings MUST be set through explicit config, never left to plugin defaults, so a dependency upgrade cannot silently change what the user reads.
- **FR-008**: Native directories MUST NOT be edited; `app.json` is the source of truth.
- **FR-009**: The user-visible `authenticationPrompt` used for the keychain read MUST be reviewed against the same standard as the purpose strings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every permission dialog the app can show states a purpose a reviewer could verify against a real code path.
- **SC-002**: The product name is spelled identically in the dialog header and body.
- **SC-003**: The binary declares no permission that no code path exercises.
- **SC-004**: A build carrying these strings passes App Store Connect processing.

## Assumptions

- Spec 001 ships in the same binary, so the camera string describes a capability that exists. If 001 slips, the camera key must be suppressed rather than described, and this spec is amended.
- Purpose strings are not shown on the App Store product page; they are visible only in the permission dialog and in Settings after the app requests the resource. There is therefore no pre-install marketing consideration here — only trust at the moment of the prompt, and review risk.
- No Apple documentation states that declaring an unused purpose string is itself a violation. The documented risk is a weak string on a permission the app does prompt for. This spec is driven by the latter.
- This is native config: it requires a prebuild and a new store binary, and is bundled with specs 001 and 003 into a single build.
