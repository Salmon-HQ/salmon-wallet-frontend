# Feature Specification: Brand naming consistency in user-facing copy

**Feature Branch**: `004-brand-naming-consistency`

**Created**: 2026-08-10

**Status**: Draft

**Input**: An audit of every place the product name appears found the name written four different ways across surfaces, several user-facing strings hardcoded in components instead of going through i18n, and one string that looks like copy but is actually a public integration contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a consistent brand on the screens where trust is decided (Priority: P1)

A user connecting a dApp, or reading the warning about never sharing a recovery phrase, sees the product named the same way it is named everywhere else.

**Why this priority**: These two screens are exactly where a user is deciding whether what they are looking at is genuine. Inconsistent branding is one of the tells people are taught to look for when spotting a phishing overlay. The dApp connect screen currently says "your Salmon wallet" with a lowercase w, and the anti-phishing warning appears in two different phrasings depending on which component renders it.

**Independent Test**: Open the dApp connect approval and the support panel, and read them against the About screen.

**Acceptance Scenarios**:

1. **Given** a dApp requests a connection, **When** the approval screen renders, **Then** the product is named consistently with every other surface.
2. **Given** the support panel, **When** the recovery-phrase warning renders, **Then** it uses one phrasing, sourced from one translation key.
3. **Given** a Spanish-language device, **When** either screen renders, **Then** the copy is in Spanish.

---

### User Story 2 - Read the About screen in your own language (Priority: P2)

A Spanish-speaking user opens About and reads Spanish.

**Why this priority**: A whole screen currently renders in English regardless of language because its strings are literals in the component rather than translation keys. It is lower priority than P1 only because About is rarely opened and carries no security weight.

**Independent Test**: Switch the device to Spanish, open About, confirm no English remains.

**Acceptance Scenarios**:

1. **Given** a Spanish device, **When** About renders, **Then** its labels, copyright line and link titles are in Spanish.
2. **Given** any language, **When** About renders, **Then** the version and build number continue to come from the app config rather than a literal.

---

### User Story 3 - See a coherent name where the OS shows it (Priority: P3)

A user installing the web app sees the same name on the install prompt and under the resulting icon.

**Why this priority**: Cosmetic and low-traffic. Included because it is one line and belongs to the same sweep.

**Independent Test**: Install the PWA and compare the prompt against the icon label.

**Acceptance Scenarios**:

1. **Given** the PWA install prompt, **When** the user installs, **Then** the icon label is a deliberate choice rather than an accident of two files disagreeing.

---

### Edge Cases

- A translation key exists in English but not in Spanish, so the Spanish build silently falls back to English. At least one such key is already known.
- A component calls `t()` with a hardcoded English fallback that has drifted from the key's actual value, so the two disagree depending on whether the key resolves.
- A string that reads like brand copy is in fact an integration identifier — see the constraint below.
- Screen-reader alternative text uses a different variant of the name than the visible copy on the same screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST be named one way in user-facing prose across all three apps.
- **FR-002**: Every user-facing string touched by this work MUST resolve through a translation key and MUST exist in both English and Spanish.
- **FR-003**: Where a component passes a fallback to `t()`, the fallback MUST match the key's English value.
- **FR-004**: Duplicated copy that says the same thing in two places MUST be reduced to one key consumed by both.
- **FR-005**: Missing Spanish translations discovered during this work MUST be added, never guessed — if the correct wording is unclear, it is raised rather than invented.
- **FR-006**: The Wallet Standard name advertised to dApps MUST NOT change. It MUST be marked in code as a contract so that a future branding pass does not "correct" it.
- **FR-007**: No identifier locked by a published store artifact may be renamed by this work.
- **FR-008**: Alternative text for the logo MUST be consistent across surfaces.

### Key Entities

- **Locked identifiers**: the bundle identifier and Android package, the Expo slug and EAS project id, the `salmonwallet://` scheme, the Firefox add-on id, and the Wallet Standard name advertised by both the extension and the web wallet. These are contracts with stores, operating systems and third-party dApps. Renaming any of them is a migration, not an edit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A search for the product name across user-facing source and translation files returns one spelling in prose.
- **SC-002**: No user-facing string introduced or touched here is a literal in a component.
- **SC-003**: A Spanish device shows no English on any screen touched by this work.
- **SC-004**: The Wallet Standard name is byte-identical to its current value and is covered by a test that fails if it changes.

## Assumptions

- The visible brand in prose is "Salmon Wallet"; the shortened "Salmon" remains correct in the deliberate brand lockups on the onboarding screens, which are design elements rather than sentences.
- The App Store listing name and the Play listing title live in the stores' consoles, not in this repo, and whether they should agree with each other is a product decision outside this spec.
- Everything here is JavaScript: it reaches mobile over the air and web and extension on their next deploy. No rebuild is required.
- The iOS permission dialogs also show a divergent spelling, but they are native config and belong to spec 002.
