# Feature Specification: QR code scanning

**Feature Branch**: `001-qr-scanning`

**Created**: 2026-08-10

**Status**: Draft

**Input**: The mobile app ships `expo-camera` but never imports it. `apps/mobile/src/components/QRScanner/QRScanner.native.tsx` is a placeholder that renders "Camera Setup Required" and is mounted by no screen, so a user sending funds must type or paste an address by hand. Implement real scanning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan a recipient address when sending (Priority: P1)

A user on the send screen taps a scan control next to the recipient field, points the camera at another wallet's QR code, and the address is filled in for them.

**Why this priority**: Pasting an address by hand is the highest-consequence manual step in the product. A truncated or wrong-clipboard address sends funds to an unrecoverable destination, and clipboard hijacking is a known attack against wallets. This story alone justifies the feature.

**Independent Test**: Open send, tap scan, present a QR encoding a valid address, confirm the recipient field is populated and the review step accepts it. Delivers the whole value on its own.

**Acceptance Scenarios**:

1. **Given** the send screen with an empty recipient, **When** the user scans a QR encoding a bare address for the active chain, **Then** the scanner closes and the recipient field holds that address.
2. **Given** the send screen, **When** the user scans a QR encoding a payment URI carrying an amount, **Then** both the recipient and the amount are populated.
3. **Given** camera permission has never been requested, **When** the user taps scan, **Then** the system permission prompt appears before the camera preview.
4. **Given** the user denies camera permission, **When** the scanner opens, **Then** it explains that scanning needs the camera and offers a route to Settings, and manual entry remains fully usable.
5. **Given** the scanner is open, **When** the user dismisses it without scanning, **Then** any address already typed is preserved unchanged.

---

### User Story 2 - Reject a QR that is not a valid destination (Priority: P1)

A user scans a code that is not an address for the active chain — a URL, a wifi credential, an address for a different blockchain.

**Why this priority**: Equal to P1 above, because a scanner that accepts anything is worse than no scanner: it converts a user's trust into a silent failure at signing time. Validation is not a refinement of the happy path, it is half the feature.

**Independent Test**: Present codes encoding a URL, an address for another chain, and random text. The scanner must reject each with a distinguishable message and stay open.

**Acceptance Scenarios**:

1. **Given** the scanner is open on a Solana send, **When** a Bitcoin address is scanned, **Then** the scanner rejects it, says the address is for a different network, and keeps scanning.
2. **Given** the scanner is open, **When** a code that is not an address at all is scanned, **Then** it is rejected without populating any field.
3. **Given** an invalid code was just rejected, **When** a valid one is presented, **Then** it is accepted without the user reopening the scanner.

---

### User Story 3 - Scan from the address book (Priority: P3)

A user adding a saved contact scans the address instead of typing it.

**Why this priority**: Same benefit as P1 but on a lower-traffic surface, and it reuses the component P1 delivers. Ship only if it costs little once P1 exists.

**Independent Test**: Add a contact via scan and confirm the stored address matches the encoded one.

**Acceptance Scenarios**:

1. **Given** the new-contact form, **When** the user scans a valid address, **Then** the address field is populated and remains editable.

---

### Edge Cases

- The device has no camera, or the camera is unavailable because another app holds it.
- Permission was granted, then revoked in Settings while the app was backgrounded.
- Several QR codes are in frame at once.
- The code is damaged, partially out of frame, or too small to resolve.
- A code is scanned twice in rapid succession, or the same frame is decoded repeatedly — the result must be handled once, not once per frame.
- The user scans a valid address that is their own active account.
- The user opens the scanner while a send is already in review.
- The app is backgrounded with the camera preview open.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST decode QR codes from the rear camera and return the decoded payload to the calling screen.
- **FR-002**: The app MUST request camera permission at the moment the user asks to scan, never earlier.
- **FR-003**: The app MUST remain fully usable without camera permission; manual address entry MUST NOT be gated behind scanning.
- **FR-004**: The scanner MUST validate a decoded payload against the active chain before returning it, and MUST reject anything that is not a usable destination.
- **FR-005**: The scanner MUST distinguish, in its message to the user, between a code that is not an address and an address belonging to a different chain.
- **FR-006**: The scanner MUST accept both a bare address and the payment-URI forms already understood elsewhere in the app, reusing the existing parsing rather than adding a second implementation.
- **FR-007**: The scanner MUST handle a successful decode exactly once per scan session.
- **FR-008**: The scanner MUST release the camera when it closes, when the screen loses focus, and when the app is backgrounded.
- **FR-009**: The scanner MUST expose stable selectors for the Maestro suite, following the repo's e2e label conventions.
- **FR-010**: All user-facing copy introduced by this feature MUST exist in both English and Spanish translation files.
- **FR-011**: The app MUST NOT request microphone access. The camera plugin's microphone permission MUST be suppressed explicitly.
- **FR-012**: The camera purpose string MUST state that the camera is used to scan QR codes. [Delivered by spec 002; this spec only guarantees the string becomes truthful.]

### Key Entities

- **Scan result**: the decoded payload plus the classification of what it turned out to be — a valid destination for the active chain, an address for another chain, or not an address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can populate a recipient address by scanning, without typing any character of it.
- **SC-002**: No QR payload that the app would later reject at signing time is ever written into the recipient field.
- **SC-003**: Denying camera permission leaves every pre-existing send flow working exactly as before.
- **SC-004**: The app requests exactly one new runtime permission — camera — and no other.
- **SC-005**: An automated flow drives send-by-scan end to end on a simulator.

## Assumptions

- The camera is used for QR scanning only. No photo capture, no video, no audio, now or as part of this spec.
- Address validation and payment-URI parsing already exist in `packages/shared` for the supported chains and are to be reused; this spec adds no new validation rules.
- Scanning is mobile-only. The web and extension surfaces keep their current behavior; `QRScanner.tsx` on web continues to tell the user to use the mobile app.
- QR *generation* for the receive screen already exists and is out of scope.
- This feature requires a native rebuild and a new store binary; it cannot ship over the air.
- The existing placeholder component and its test will be replaced, not extended.
