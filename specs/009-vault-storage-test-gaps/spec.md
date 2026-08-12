# Feature Specification: Close the test gaps on vault persistence and key-cache paths

**Feature Branch**: `test/security-gaps-crypto-storage`

**Created**: 2026-08-12

**Status**: Draft

**Input**: The 2026-08-12 audit found that the two modules a wallet can least afford to break are the least tested: `packages/shared/src/storage/` (where the encrypted vault persists and session timeout is decided) has zero test files, and the hot key-cache unlock path in `packages/shared/src/crypto/encryption.ts` (`unlockAndGetKey`, `unlockWithKey`, `lockWithKey`) appears only as mocks in other tests. There is also no test proving that a tampered vault fails closed, and no golden vector freezing the KDF parameters — an accidental change to `DEFAULT_ITERATIONS` or the hash would silently break every existing user's vault. This batch adds ONLY tests; production behavior in these paths must not change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A stored vault keeps opening after refactors (Priority: P1)

A user created their wallet months ago. Any code change that would make their persisted vault unreadable (KDF params, cipher layout, serialization) must fail CI before it ships.

**Why this priority**: This is the wallet's equivalent of data loss. There is no recovery path other than the seed phrase, and users who trusted "remember my vault" may not have it at hand.

**Acceptance Scenarios**:

1. **Given** a golden vault fixture generated with today's code and a known password, **When** `unlock` runs against it, **Then** it yields the exact expected mnemonics — and the fixture is a committed constant, not regenerated at test time.
2. **Given** the golden fixture, **When** any KDF parameter or cipher detail changes, **Then** the golden test fails (this is the point: the fixture pins the format).

### User Story 2 - A tampered vault fails closed (Priority: P1)

If ciphertext, nonce, or salt of a stored vault are corrupted or manipulated, unlocking must throw — never return garbage mnemonics or partial data.

**Acceptance Scenarios**:

1. **Given** a valid vault with one byte flipped in the ciphertext, **When** `unlock` runs with the correct password, **Then** it throws (GCM auth failure) and no mnemonic material is returned.
2. **Given** the same manipulation on nonce and on salt (separately), **Then** unlock throws likewise.

### User Story 3 - The key-cache unlock path actually works (Priority: P1)

The cached-key fast path (`unlockAndGetKey`, `unlockWithKey`, `lockWithKey`) is what runs on every unlock after the first. Today only mocks of it are tested.

**Acceptance Scenarios**:

1. **Given** a vault locked with a password, **When** `unlockAndGetKey` runs, **Then** it returns both the mnemonics and a key that `unlockWithKey` accepts to unlock the same vault without the password.
2. **Given** a key from a different vault/password, **When** `unlockWithKey` runs, **Then** it throws rather than decrypting.
3. **Given** `lockWithKey` output, **When** unlocked with the original password, **Then** round-trip content matches.

### User Story 4 - Session and vault persistence behave at the edges (Priority: P2)

`stash.ts` decides when the wallet re-locks (`isSessionTimedOut`) and `storage.ts` adapters persist the vault across platforms.

**Acceptance Scenarios**:

1. **Given** a last-activity timestamp exactly at / just under / just over the timeout, **Then** `isSessionTimedOut` answers correctly at the boundary (fake timers, no real sleeps).
2. **Given** corrupted JSON in the underlying storage, **When** typed storage reads it, **Then** the failure mode is explicit (error or documented fallback) — not silently returning corrupt data. The test asserts whichever contract the implementation actually has today.
3. **Given** the in-memory stash, **Then** get/set/init round-trips work and `updateLastActivity` refreshes the timeout window.

### User Story 5 - Recover-flow input hygiene (Priority: P2)

`normalizeMnemonic`, `validateMnemonicWords`, `generateValidationPositions` are the input boundary of the recover flow and have live consumers in all three apps, but no tests.

**Acceptance Scenarios**:

1. **Given** a mnemonic with mixed case, extra spaces, and newlines, **When** normalized, **Then** the result matches the canonical form and validates.
2. **Given** a 12-word list with one invalid word, **Then** `validateMnemonicWords` identifies it.
3. **Given** `generateValidationPositions`, **Then** positions are within range, unique, and of the requested count.
4. **Given** `deriveChildFromPath` with a fixed seed and path, **Then** the derived key matches a pinned expected value (replacing the current `toBeDefined`-only test).

## Requirements *(mandatory)*

- **FR-001**: Tests only. No file under `packages/shared/src/{crypto,storage}` other than `*.test.ts` may change. If a test reveals a real bug, STOP and report — do not fix production code in this batch (AGENTS.md security-sensitive rule).
- **FR-002**: Golden fixtures are committed constants with a comment explaining how they were generated. Test mnemonics must be well-known BIP39 test vectors (e.g. `abandon … about`), never anything resembling a real secret.
- **FR-003**: No real timers; boundary tests use fake timers.
- **FR-004**: Follow `shared-test-authoring` skill conventions (Vitest, existing mocking patterns in the sibling test files).
- **FR-005**: The web-crypto fallback path already tested in `encryption.test.ts` must not be duplicated — extend the existing files where a file exists, create new files only for `storage/`.

## Success Criteria *(mandatory)*

- **SC-001**: `packages/shared/src/storage/` has direct tests for `stash.ts` and `storage.ts`.
- **SC-002**: `unlockAndGetKey`/`unlockWithKey`/`lockWithKey` execute for real (not as mocks) in at least one test each.
- **SC-003**: A golden vault fixture pins KDF params + cipher layout; a tampered-vault test proves fail-closed behavior.
- **SC-004**: Full gates green: `pnpm turbo run typecheck lint test --force` + `check:i18n`.

## Out of scope

Bitcoin PSBT golden test and extension `background.ts` (batch 5b), any production change, coverage thresholds, E2E.
