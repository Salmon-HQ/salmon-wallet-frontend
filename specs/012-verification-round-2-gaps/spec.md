# Feature Specification: Close the gaps the second-pass verification found

**Feature Branch**: `test/security-gaps-round-2`

**Created**: 2026-08-12

**Status**: Draft

**Input**: Three fresh adversarial verifiers (crypto/storage x2 with mutation testing, CI, test-quality) reviewed everything built today. The fork-PR CI surface and the golden vectors held up. The verifiers surfaced a set of real gaps: one production behavior weakness in the lock flow, one KDF-downgrade mutation that escapes the test suite, and several untested silver-path exports. This batch closes them. All items are tests only, EXCEPT one clearly-marked production fix in the lock flow that must fail closed on a corrupt vault.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A corrupt vault fails closed, never skips the lock (Priority: P1, PRODUCTION CHANGE)

If the stored vault is corrupted (unparseable), the wallet must refuse to proceed as if it were unlocked plaintext — it must require the lock / surface an error, not set `requiredLock=false`.

**Why this priority**: `initializeAccountsSecurity` currently sends a corrupt encrypted vault down the legacy-plaintext branch (`isEncryptedMnemonics(rawString) === false`) and calls `setRequiredLock(false)`, skipping the lock screen. No key material leaks (the data is garbage), but a wallet must fail closed on corrupt security state, not open.

**Acceptance Scenarios**:

1. **Given** storage holds an unparseable string under the mnemonics key, **When** `getStoredMnemonics` reads it, **Then** it returns `null` (the raw corrupt string is never surfaced as `StoredMnemonics`).
2. **Given** a corrupt vault, **When** `initializeAccountsSecurity` runs, **Then** it does NOT call `setRequiredLock(false)` and does NOT load accounts from garbage.
3. **Given** a legitimate legacy plaintext record (`Record<string,string>`, an object), **When** it is read, **Then** behavior is unchanged — it still loads and sets `requiredLock=false`. The fix must not break the real plaintext-legacy path.

### User Story 2 - A KDF downgrade cannot escape the test suite (Priority: P1)

Changing `lock()`'s effective iteration count without touching the `DEFAULT_ITERATIONS` constant must fail a test.

**Why this priority**: today no test locks with production defaults and asserts the resulting vault's `iterations === DEFAULT_ITERATIONS`. A mutation that hardcodes `iterations = 1000` inside `lock` passes everything (the constant is unchanged; round-trip tests pass `TEST_OPTIONS`).

**Acceptance Scenarios**:

1. **Given** `lock(data, password)` called with NO options, **Then** the produced vault has `iterations === DEFAULT_ITERATIONS` and `digest === DEFAULT_DIGEST`.

### User Story 3 - Legacy sha256 vaults are proven to unlock (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a committed golden vault fixture produced with `digest: 'sha256'` (the legacy v2 shape that `needsMnemonicUpgrade` and `migrateLegacyWallets` exist to handle), **When** `unlock` runs with the known password, **Then** it yields the exact expected mnemonics — pinning that the sha256 decrypt path works, not just sha512.

### User Story 4 - The legacy migration and the extension stash sender are tested (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a legacy v2 vault, **When** `migrateLegacyWallets` runs, **Then** it re-encrypts to current defaults and preserves the mnemonics (round-trip), covering the silver path that today has no unit test.
2. **Given** `createExtensionStash`, **Then** its `sendMessage` wrapper and `chrome.runtime.lastError` handling are exercised (the sender side of the derived-key-cache channel).

### User Story 5 - Remaining tautology and consistency cleanups (Priority: P3)

**Acceptance Scenarios**:

1. `unlock` rejects a vault with an unknown `kdf` (today `validateVault` ignores `kdf`; a one-liner test pins the format).
2. `deriveBitcoinKeypair`'s `toBeDefined()`-only assertions become a pinned value, matching what `deriveChildFromPath` already does.
3. `apps/extension/src/background.test.ts`'s method-routing `it.each` covers all six `APPROVAL_METHODS` (adds `signOffchain`, `signAllTransactions`, `signAndSendTransaction`).
4. `e2e.yml`'s `upload-artifact` pin is aligned to the v7 SHA used in `build-extension.yml`.

## Requirements _(mandatory)_

- **FR-001**: Everything is tests only EXCEPT User Story 1, which changes `getStoredMnemonics` (production, security-sensitive lock flow). That change must be the smallest fail-closed guard, must not alter the legitimate plaintext-legacy path, and must ship with the test that proves both directions.
- **FR-002**: Do NOT touch `packages/shared/src/crypto/*.ts` or `storage.ts`/`stash.ts` production behavior — the KDF/sha256/kdf work is test-only. If a test reveals a real bug in those, STOP and report.
- **FR-003**: Golden fixtures are committed constants generated once from the real code, documented in a comment; mnemonics are public BIP39 test vectors only.
- **FR-004**: Follow `shared-test-authoring`. Ethereum untouched.

## Success Criteria _(mandatory)_

- **SC-001**: A corrupt-vault test proves `getStoredMnemonics` returns null and the lock is not skipped; a plaintext-legacy test proves that path still works.
- **SC-002**: The KDF-downgrade mutation is caught (defaults-lock assert).
- **SC-003**: sha256 golden vault unlocks; `migrateLegacyWallets` and `createExtensionStash` have direct tests.
- **SC-004**: Full gates green + format:check + check:i18n.

## Out of scope

GitHub settings (tech lead's REPO-SETTINGS.md), Solana `createTransfer` devnet coverage (conscious gap), the `responseHandlers` origin-binding design note (not exploitable), any Ethereum change.
