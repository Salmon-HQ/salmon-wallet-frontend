# Feature Specification: Biometric unlock — rebuild the gate around a wrapped vault key

**Feature Branch**: `fix/029-biometric-unlock` · spec dir `029-biometric-unlock`
**Created**: 2026-09-07 · **Status**: Implemented — see §12 for what was built and what was not
**Bugs**: Linear `DEV-41` (Face ID broken in the latest release), `DEV-34` (biometrics enabled but the app asks for the password after some time)
**Scope**: `apps/mobile` (all of it), `packages/shared/src/crypto` + `src/hooks` (the contract), `apps/extension` (unaffected — see §7)

---

## 1. Summary

Salmon's mobile biometric unlock does not gate a secret. It **snapshots a session
artefact** — the in-memory `DerivedKeyCache` produced during onboarding — serialises it
to JSON, and parks it in the iOS keychain behind Face ID. That snapshot is pinned to the
vault's _salt_ and carries a five-minute _expiry_ that no reader enforces. Nothing ever
rewrites it. Every event that legitimately changes the vault's salt, and every event that
legitimately invalidates a `.biometryCurrentSet` keychain item, silently and permanently
kills Face ID for that user — while `Settings → Security` keeps rendering the toggle as
**on**, and the only code path in the entire app that can write a new biometric key is a
first-run onboarding screen the user can never reach again.

Both tickets are that one defect, observed at two different moments.

| Ticket     | What the user reports                                          | What actually happened                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DEV-34** | "Biometrics is on but after some time it asks for my password" | The keychain item was invalidated (Face ID re-enrolment / alternate appearance / OS reset). `getItemAsync` resolves `null` per Apple + Expo contract, the code reads that as "no key", shows the password field, and never offers re-enrolment.                                                                                                                                             |
| **DEV-41** | "Face ID doesn't work in the latest version"                   | The user typed that password once. `unlockAccounts` ran the `upgradeOutdatedVault` path, which re-encrypts the vault with a **freshly random salt**. The biometric blob still holds the old salt, so `unlockWithKey` now throws `salt does not match` on every future Face ID attempt. Permanent. The KDF bump that made every pre-June vault "outdated" landed in `37906da5` (2026-06-19). |

DEV-34 is the trigger. DEV-41 is the terminal state DEV-34 walks the user into. They are
not independent.

**Verdict: rebuild.** Argued in §5.

---

## 2. Current implementation, as it actually is

### 2.1 What is stored, and where

| Artefact                                                                  | Store                                                            | Protection                                                                                      | Written by                                                                            |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Encrypted mnemonic vault (`LockedVault` + `isEncrypted`)                  | AsyncStorage (`STORAGE_KEYS.MNEMONICS`)                          | PBKDF2-SHA512 / 220 000 iters → NaCl secretbox (`packages/shared/src/crypto/encryption.ts:268`) | `lock` / `lockAndGetKey`                                                              |
| `DerivedKeyCache` — **the raw 32-byte vault key**                         | in-memory stash only (`packages/shared/src/storage/stash.ts:56`) | none; process memory                                                                            | `resolveMnemonicsWithPassword` (`useAccountsSecurityHelpers.ts:84`)                   |
| `salmon_biometric_key` — **a JSON copy of that same raw key**             | iOS keychain / Android keystore via `expo-secure-store`          | `requireAuthentication: true`                                                                   | `useBiometricAuth.storeKeyForBiometric` (`apps/mobile/hooks/useBiometricAuth.ts:291`) |
| `salmon_biometric_key_exists` / `..._marker` / `salmon_biometric_enabled` | same store, **unprotected**                                      | none                                                                                            | same hook (`:297`, `:300`, `:384`)                                                    |

`DerivedKeyCache` is defined at `packages/shared/src/crypto/encryption.ts:57-68`:

```ts
export interface DerivedKeyCache {
  key: number[]; // the raw secretbox key, as a JSON number array
  salt: string; // base58; MUST equal the vault's current salt
  iterations: number;
  digest: DigestAlgorithm;
  expiresAt: number; // Date.now() + 5 minutes
}
```

This type was designed as a _five-minute in-process cache to skip a re-derivation_
(`KEY_CACHE_TTL`, `:71`). The biometric feature persists it to durable hardware storage
unchanged. That mismatch — a session object used as a durable credential — is the root of
everything below.

### 2.2 The lock lifecycle

- **Lock trigger**: exactly one. `AppState` → `background` in `apps/mobile/app/_layout.tsx:254-270`,
  which calls `actions.lockAccounts()`. `inactive` is deliberately excluded (`:258-263`)
  so the Face ID sheet does not re-lock the app underneath itself.
- **Inactivity timeout**: **disabled on mobile** — `apps/mobile/app/_layout.tsx:163-167`
  passes `enabled: false` to `useInactivityTimeout`. The 5-minute `expiresAt` on the key
  cache is therefore the only time-based construct in the mobile flow, and it is never
  read on the biometric path.
- **`lockAccounts`** (`packages/shared/src/hooks/useAccountsSecurity.ts:109-112`): sets
  `locked = true` and removes `STASH_KEYS.DERIVED_KEY` from the in-memory stash. The
  decrypted `SecretVault` held in `state.accounts[].secret` is **not** wiped — see §8.
- **Cold start**: `initializeAccountsSecurity` (`useAccountsSecurityHelpers.ts:145-181`)
  reads the stash. On mobile the stash is `createMemoryStash()` (`stash.ts:294-297`), so
  after any process death it is always empty → `loadMetadata()` → `setLocked(true)`.
- **Where the lock screen mounts**: `apps/mobile/app/(app)/_layout.tsx:231` renders
  `<LockOverlay>` only when `isLocked`, and only inside the `(app)` route group.

### 2.3 The cold-start routing hole

`loadMetadata` (`packages/shared/src/hooks/useAccountsLoader.ts:41-66`) populates
`state.accounts` with placeholder-secret records **before** the lock is raised. So on a
locked cold start `state.accounts.length > 0` is true, and the root router at
`apps/mobile/app/_layout.tsx:214` refuses to navigate:

```ts
if (!inAppGroup && !hasNavigated && !state.locked && !isPostCreationScreen) {
```

`state.locked` is true, so the redirect never fires and `unstable_settings.initialRouteName`
(`:45-48`) leaves the user on `(auth)/index` — **the onboarding welcome screen**, with
"Create wallet" as the primary button and a _text link_ ("access existing account",
`apps/mobile/app/(auth)/index.tsx:117`) as the way back into their own funds. Only after
that tap does `(app)/_layout` mount and the Face ID prompt appear
(`apps/mobile/app/(auth)/index.tsx:75-78`).

A returning user's first screen is an onboarding screen. That is a product bug in its own
right and it is also why "Face ID doesn't come up" reads as broken even in the sessions
where the key is intact.

### 2.4 Enrolment: one path, unreachable after onboarding

`storeKeyForBiometric` has exactly **one** production caller:
`apps/mobile/app/(auth)/biometric-setup.tsx:100`, a step of the wallet-creation stack
(`apps/mobile/app/(auth)/_layout.tsx`, screen 6 of 8). Verified by grep across `apps/` and
`packages/` — no other call site.

The Settings toggle does _not_ enrol. `apps/mobile/src/settings/panelRegistry.tsx:144-146`:

```tsx
onToggleBiometric={async (enabled: boolean) => {
  await setEnableBiometric(enabled);
}}
```

`setEnableBiometric(true)` (`useBiometricAuth.ts:381-396`) writes the preference string and
nothing else. It never mints a key. So flipping the toggle back on leaves
`hasStoredKey === false`, `canUseBiometric` false (`LockContent.tsx:134-139`), and the lock
screen goes straight to the password field. The toggle reads as on and does nothing.

`onPasswordChanged={clearBiometricKey}` (`panelRegistry.tsx:147`) correctly deletes the key
after a password change — but leaves `salmon_biometric_enabled = 'true'`, producing the
exact DEV-34 state, with no way out.

Two further copies of `useBiometricAuth` exist (`(app)/_layout.tsx:43`,
`panelRegistry.tsx:113`, plus `biometric-setup.tsx:71`). Each holds its own
`enableBiometric` React state. A toggle flipped in Settings updates the panel's copy; the
lock screen's copy stays stale until the `(app)` layout remounts.

### 2.5 The read path

`useBiometricAuth.ts:339-372`:

```ts
const BIOMETRIC_TIMEOUT_MS = 30_000;
const storedKey = await Promise.race([
  SecureStore.getItemAsync(BIOMETRIC_KEY_STORAGE),
  new Promise<null>((resolve) => setTimeout(() => resolve(null), BIOMETRIC_TIMEOUT_MS)),
]);
if (!storedKey) {
  console.warn('No stored key found after biometric auth');
  return null;
}
```

Three problems in eleven lines:

1. `getItemAsync` is called **without options** — no `requireAuthentication`, no
   `authenticationPrompt`. It still works (the native `get` falls through to the `:auth`
   service alias, `node_modules/expo-secure-store/ios/SecureStoreModule.swift:78`) but the
   OS prompt shows a default reason string instead of the localised
   `lock.biometric_prompt` the enrol path bothers to set.
2. **An invalidated key is indistinguishable from "never enrolled".** Both produce `null`.
   Per `node_modules/expo-secure-store/src/SecureStore.ts:143-150`: _"It resolves with
   `null` if there is no entry for the given key **or if the key has been invalidated**.
   Keys are invalidated by the system when biometrics change… After a key has been
   invalidated, it becomes impossible to read its value."_ The code takes the `null`,
   shows the password field, and leaves the stale `enabled: true` preference in place.
3. The 30-second race resolves `null` while the native Face ID sheet is **still on
   screen**. The user then authenticates into a promise nobody is holding.

The `catch` at `:361-371` calls `clearBiometricKey()` on any non-cancellation error —
including a transient `errSecInteractionNotAllowed` (-25308) from reading a
`kSecAttrAccessibleWhenUnlocked` item while the device is locked. One transient OS
condition permanently destroys the enrolment.

### 2.6 The library, at the exact installed version

`expo-secure-store@55.0.13`, `expo-local-authentication@55.0.13`, Expo SDK `~55.0.16`,
React Native `0.83.6` (`apps/mobile/package.json`, `pnpm-lock.yaml:4948,5019`). Both config
plugins are registered with `faceIDPermission` (`apps/mobile/app.json:56-66`), so
`NSFaceIDUsageDescription` is present — the native `MissingPlistKeyException`
(`SecureStoreModule.swift:100-102`) is not in play. `apps/mobile/ios/` is gitignored (CNG),
and the locally generated `Info.plist:62` carries the key.

Facts that matter, read from the installed source and the vendored docs:

- **`requireAuthentication: true` ⇒ `.biometryCurrentSet`, hardcoded.**
  `SecureStoreModule.swift:105`:
  `SecAccessControlCreateWithFlags(kCFAllocatorDefault, accessibility, .biometryCurrentSet, &error)`.
  Not configurable. This is the strictest flag Apple offers: the item dies when the
  biometric database changes at all — adding an alternate appearance, adding a finger,
  resetting Face ID. Apple: <https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/biometrycurrentset>
- **Default accessibility is `WHEN_UNLOCKED`** (`SecureStoreOptions.swift:8`) →
  `kSecAttrAccessibleWhenUnlocked` (`SecureStoreModule.swift:204-205`). Not
  `…ThisDeviceOnly`, so on paper the item is iCloud-keychain eligible; and it is
  unreadable while the device screen is locked. Apple:
  <https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlocked>
- **iOS never prompts on create.** `set` uses `SecItemAdd` (`:112`); an access control is
  evaluated only on read or update. `f5ba6035` already worked around this by firing an
  explicit `LocalAuthentication.authenticateAsync` before the write
  (`useBiometricAuth.ts:279-289`) — correct, and worth keeping.
- **Expo's own warning that this cannot be QA'd on a simulator**
  (`node_modules/expo-secure-store/src/SecureStore.ts:83`): _"This library requires a real
  device for testing since emulators/simulators do not require biometric authentication
  when retrieving secrets, unlike real iOS devices."_ This is why both bugs reached
  production.
- **Expo's warning against sharing a `keychainService` between authenticated and
  unauthenticated items** (`SecureStore.ts:74-76`). The app stores the protected key and
  three unprotected flags under the same default service `"app"`. SDK 55 suffixes the
  service with `:auth` / `:no-auth` (`SecureStoreModule.swift:172-176`) so this is
  currently benign, but it is undocumented internal behaviour to be leaning on.

Docs, exact versions:
<https://docs.expo.dev/versions/v55.0.0/sdk/securestore/> ·
<https://docs.expo.dev/versions/v55.0.0/sdk/local-authentication/>

---

## 3. Root cause — DEV-41

**Mechanism (confirmed, no hypothesis):** a vault re-salt orphans the biometric blob, and
there is no code path that rewrites it.

1. `37906da5` (2026-06-19) raised `DEFAULT_ITERATIONS` from 210 000 to 220 000
   (`packages/shared/src/crypto/encryption.ts:117`). Its message states the change is
   backward-compatible because decryption reads each vault's own iteration count. True for
   the password path. False for the biometric path.
2. `needsMnemonicUpgrade` (`useAccountsSecurityHelpers.ts:52-54`) now returns `true` for
   **every vault created before that commit**:
   `vault.digest !== DEFAULT_DIGEST || vault.iterations !== DEFAULT_ITERATIONS`.
3. `unlockAccounts` passes `{ upgradeOutdatedVault: true }`
   (`useAccountsSecurity.ts:135-137`).
4. `resolveMnemonicsWithPassword` therefore runs `useAccountsSecurityHelpers.ts:86-90`:

   ```ts
   const { vault: newVault, keyCache: newKeyCache } = await lockAndGetKey(data, password);
   await setStorageItem(STORAGE_KEYS.MNEMONICS, { ...newVault, isEncrypted: true });
   await setStashItem(STASH_KEYS.DERIVED_KEY, newKeyCache);
   ```

   `lockAndGetKey` mints `const salt = randomBytes(SALT_LENGTH)`
   (`encryption.ts:311`) — a **new random salt**. The stash is updated. The keychain blob
   is not; nothing in the repo can update it.

5. Every subsequent Face ID unlock reaches `unlockWithKey`
   (`useAccountsSecurity.ts:173` → `encryption.ts:567`):

   ```ts
   if (locked.salt !== keyCache.salt) {
     throw new IncorrectPasswordError('Key cache salt does not match vault salt');
   }
   ```

   `unlockWithCachedKey` catches, returns `false` (`useAccountsSecurity.ts:177-183`),
   `LockContent.handleBiometricUnlock` shows `lock.biometric_unlock_failed` and drops to
   the password field (`LockContent.tsx:204-208`). Forever.

The same orphaning is produced by `changeStoredPassword`
(`useAccountsSecurityHelpers.ts:115`, `lock(mnemonics, newPassword)` → new salt). That one
_is_ handled — `onPasswordChanged={clearBiometricKey}` — but only by deleting the key, and
`setEnableBiometric` is never set back to `false`, and §2.4 shows there is no re-enrolment
path. Same terminal state, reached deliberately.

**Why "the latest version".** The 1.1.0 window (`34f82080` redesign → `b333a29f` release,
both 2026-09-03) did not change the biometric hook — its logic is byte-identical to
`34f82080^`. What it changed is visibility: the redesign shipped a Security panel with a
protection score computed from "password + biometrics", so a broken toggle that used to be
invisible now sits on a scored screen. The functional break dates from June; the reports
date from the release that made it legible. **This part is inference, not proof** — the
confirming experiment is in §3.2.

### 3.1 Contributing defect (independent, same ticket)

The cold-start routing hole of §2.3: a returning user with a locked wallet lands on the
onboarding welcome screen and gets no Face ID prompt until they find a text link. On a
device where the keychain item is intact, this alone reproduces "Face ID doesn't work".

### 3.2 The one experiment that closes the remaining inference

On a **physical iOS device** (not a simulator — see §2.6), install a build from before
`37906da5`, create a wallet, enrol Face ID, confirm Face ID unlock works. Update to 1.1.0.
Force-quit, reopen, unlock **with the password once**. Reopen. Expected: Face ID prompt
appears, succeeds at the OS level, and the app falls to the password field —
`console.warn('Failed to unlock accounts with cached key:', …)` in
`useAccountsSecurity.ts:180` carrying `Key cache salt does not match vault salt`.

---

## 4. Root cause — DEV-34

**Mechanism (confirmed at the API-contract level):** `null` from `getItemAsync` is
overloaded, and the app's response to it is to go quiet.

1. iOS invalidates the item. Causes, all normal user behaviour: the user adds an alternate
   appearance to Face ID, re-enrols after a bad-scan streak, resets Face ID, or adds a
   fingerprint on Android. `.biometryCurrentSet` (`SecureStoreModule.swift:105`) makes each
   of these fatal to the item.
2. `getItemAsync` **resolves `null`** — it does not throw
   (`node_modules/expo-secure-store/src/SecureStore.ts:143-150`).
3. `useBiometricAuth.ts:355-358` treats `null` as "no key", returns `null`.
4. `LockContent.tsx:200-203` sets `showPasswordFallback(true)` with **no error text** —
   `setError` is only called on the `onUnlockWithKey` failure branch, not this one.
5. `salmon_biometric_key_exists` is still `'true'` and `salmon_biometric_enabled` is still
   `'true'`, so `Settings → Security` keeps rendering the switch **on**
   (`panelRegistry.tsx:143`), `canUseBiometric` stays true, and the lock screen keeps
   offering a "Use Face ID" button (`LockContent.tsx:510-521`) that can only ever fail.

That is verbatim the ticket: enabled, but asks for the password.

**Second, lower-frequency mechanism, same outcome.** `kSecAttrAccessibleWhenUnlocked`
(§2.6) makes the item unreadable while the device screen is locked. A background wake in
that state raises `errSecInteractionNotAllowed`, `searchKeyChain` throws
`KeyChainException` (`SecureStoreModule.swift:168`), and the catch at
`useBiometricAuth.ts:366-369` calls `clearBiometricKey()` — turning a transient OS
condition into permanent destruction of the enrolment.

**Third contributor to "after some time".** The mobile stash is memory-only
(`stash.ts:294-297`) and mobile has no inactivity timeout
(`app/_layout.tsx:163-167`), so the _only_ thing standing between a user and the lock
screen is iOS reclaiming the process. "After some time" is, in part, simply the OS killing
a backgrounded wallet — correct behaviour that becomes a complaint because the unlock that
follows is broken.

**Shared root cause with DEV-41: yes.** Both are "the biometric secret is a stale snapshot
of a session object with no write path". DEV-34 is the invalidation half, DEV-41 the
re-salt half. Fixing one without the other leaves the user in the same place.

---

## 5. Verdict — rebuild

**Rebuild.** Not a patch.

The design is wrong at the level of _what the keychain holds_, and no amount of guarding
around the current shape fixes it:

- **The secret is the wrong artefact.** A `DerivedKeyCache` is a 5-minute performance cache
  (`encryption.ts:57-71`) pinned to a salt that legitimately rotates. Persisting it as a
  durable credential means the credential is invalidated by ordinary vault maintenance.
  Adding "re-store after every unlock" patches the symptom and still leaves a raw vault key
  in a keychain item that iOS may destroy for reasons the app cannot observe.
- **The keychain holds a key that unlocks funds, and its loss is unrecoverable in-app.**
  `expo-secure-store` gives exactly one access-control flag, hardcoded, and reports
  invalidation as `null`. A wallet cannot build a credential on an API that cannot tell
  "gone" from "never existed".
- **There is no enrolment surface.** Re-enrolment is not a missing branch — it is a missing
  screen, a missing hook contract, and a missing place to put the password it requires.
- **Biometric state is triplicated app-local React state** (§2.4) with no single source of
  truth, so the UI cannot be made honest without moving it.
- **The lock screen is not the app's entry surface** (§2.3). That is routing architecture,
  not a bug fix.

Six coupled defects across storage shape, access control, state ownership and routing. The
rebuild below is roughly the size of the patch set that would be needed anyway, and ends
with something testable.

**Not in scope, deliberately**: replacing `expo-secure-store` with
`react-native-keychain`. The wrapped-key design of §6 works within
`expo-secure-store@55`'s single access-control flag and does not need
`accessControl`/`accessible` tuning. Revisit only if §6.4's enrolment-change handling
proves insufficient on device.

---

## 6. Target design

### 6.1 The core change: the keychain holds a wrapping key, not the vault key

Today: `keychain → DerivedKeyCache{ key, salt, … } → unlockWithKey(vault, cache)`.
Salt-coupled. Rotation-fragile. A raw vault key at rest in an OS store.

Target: **the keychain holds a random 32-byte wrapping key with no relationship to the
vault.** A second, unprotected record holds the vault password sealed under that wrapping
key.

```
keychain (requireAuthentication: true)   →  bioWrapKey: 32 random bytes
keychain (requireAuthentication: false)  →  { nonce, sealed }   // secretbox(password, nonce, bioWrapKey)

unlock:  bioWrapKey ←Face ID→  open(sealed) → password → the ordinary password unlock path
```

Properties this buys, each mapping to a defect above:

| Property                                                                         | Kills                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The wrapping key is independent of the vault salt                                | DEV-41: re-salting the vault cannot orphan it                                                   |
| The recovered artefact is the _password_, which feeds `unlockAccounts` unchanged | one unlock code path, so KDF upgrades, throttle and migration all apply to biometric unlock too |
| The wrapping key is random, single-purpose, and rotatable                        | a lost/invalidated wrapping key costs one re-enrolment, never funds                             |
| The sealed blob is useless alone, and the wrapping key is useless alone          | keychain compromise without biometry yields nothing                                             |

Sealing uses the existing `tweetnacl` `secretbox` already imported by
`packages/shared/src/crypto/encryption.ts:2` — no new dependency.

> **Security note for the human**: this stores a reversible envelope of the unlock password
> in the OS keychain behind biometry. That is the standard trade every biometric wallet
> makes and is strictly better than today (a raw vault key, same store, same protection,
> plus a durable copy of the KDF parameters). It must still be signed off explicitly —
> see §10 Q1.

### 6.2 State machine

Five states. Mobile only; the extension has its own (§7).

```
                    cold start / process death
                              │
                              ▼
                        ┌───────────┐   no vault
                        │  LOADING  │──────────────▶ ONBOARDING
                        └─────┬─────┘
                              │ vault present
                              ▼
   ┌──────────────────── ┌────────┐ ◀─────────────────────────┐
   │                     │ LOCKED │                            │
   │                     └───┬────┘                            │
   │     biometrics armed?   │                                 │
   │        ┌────────────────┴────────────────┐                │
   │        ▼ yes                          no ▼                │
   │  ┌───────────┐  cancel / fail / null  ┌──────────┐         │
   │  │ PROMPTING │───────────────────────▶│ PASSWORD │         │
   │  └─────┬─────┘                        └────┬─────┘         │
   │        │ password recovered                │ correct       │
   │        └──────────────┬────────────────────┘               │
   │                       ▼                                    │
   │                 ┌──────────┐   AppState → background       │
   │                 │ UNLOCKED │───────────────────────────────┘
   │                 └────┬─────┘   (or explicit "Lock now")
   │                      │
   │                      ▼ AppState → inactive
   │                 ┌──────────┐
   └─────────────────│ SHIELDED │  privacy cover, NOT a lock
     back to active  └──────────┘
```

- **`SHIELDED`** is new and is what makes the `inactive` handling honest. Today `inactive`
  is ignored entirely (`app/_layout.tsx:258-263`) because locking there loops against the
  Face ID sheet. The result is that the app-switcher snapshot shows balances. `SHIELDED`
  draws an opaque cover on `inactive` and lifts it on `active` **without touching
  `locked`** — no loop, no snapshot leak.
- **`PROMPTING` is entered only from `LOCKED` with `AppState === 'active'`**, and it is a
  state, not a `useRef` + `setTimeout(400)` (`LockContent.tsx:229-250`). The 400 ms guess
  and the 30-second `Promise.race` (`useBiometricAuth.ts:349-353`) both go: the OS owns the
  prompt's lifetime and reports its own result.
- **Every transition out of `PROMPTING` is explicit and named** (§6.4). "Fell through to
  the password field with no message" stops being reachable.

### 6.3 What each store holds

| Store                                                                                                                              | Holds                                          | Protection                                | Cleared when                                        |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| AsyncStorage                                                                                                                       | encrypted vault                                | password-derived, unchanged               | wallet reset                                        |
| iOS keychain, `requireAuthentication: true`, `keychainService: 'salmon.bio'`, `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` | `bioWrapKey` (32 random bytes)                 | Face ID / Touch ID, `.biometryCurrentSet` | disarm, password change, invalidation, wallet reset |
| iOS keychain, `requireAuthentication: false`, `keychainService: 'salmon.meta'`                                                     | `{ nonce, sealed, armedAt, vaultFingerprint }` | none needed                               | same                                                |
| in-memory stash                                                                                                                    | `DerivedKeyCache`, unchanged, TTL enforced     | process memory                            | `lockAccounts`                                      |

Two deliberate changes from today:

- **`WHEN_UNLOCKED_THIS_DEVICE_ONLY`** instead of the `WHEN_UNLOCKED` default. `ThisDeviceOnly`
  keeps the item out of iCloud keychain and encrypted backups — mandatory for a wallet.
  Passed explicitly, not inherited (`SecureStoreOptions.swift:8`).
- **Separate `keychainService` values** for the protected and unprotected records, so the
  app stops depending on `expo-secure-store`'s undocumented `:auth`/`:no-auth` suffixing
  (`SecureStoreModule.swift:172-176`) and complies with the documented warning
  (`SecureStore.ts:74-76`).

`vaultFingerprint` is a short hash of the vault's `salt|iterations|digest`, kept **only** to
detect drift and surface a clear "re-arm needed" state. It is not used for decryption — the
design no longer depends on the salt.

### 6.4 Enrolment-change and failure handling

`bioUnlock()` returns a **discriminated result**, never a bare `string | null`:

| Result           | Cause                                                                      | UI                                                                                           | Persisted state change                |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `ok(password)`   | success                                                                    | proceed to unlock                                                                            | `armedAt` refreshed                   |
| `cancelled`      | user dismissed                                                             | password field, **no error text**                                                            | none                                  |
| `invalidated`    | `getItemAsync` → `null` while `armed === true`                             | password field + "Face ID was reset on this device. Turn it back on in Settings → Security." | `armed = false`, both records deleted |
| `unavailable`    | no hardware / not enrolled / device locked (`errSecInteractionNotAllowed`) | password field, **no error text**                                                            | **none — nothing is deleted**         |
| `failed(reason)` | anything else                                                              | password field + generic message                                                             | none                                  |

The `invalidated` vs `unavailable` split is the whole DEV-34 fix. Today both land in the
same `null` (`useBiometricAuth.ts:355`) and `unavailable` additionally triggers destruction
(`:366-369`). Disambiguation: consult `LocalAuthentication.hasHardwareAsync()` +
`isEnrolledAsync()` **before** classifying a `null`. Hardware present and enrolled + `null`

- `armed` ⇒ `invalidated`. Otherwise ⇒ `unavailable`.

`armed = false` is set **only** on `invalidated`, on explicit disarm, and on password
change. It is the single flag the Settings toggle reads — the three-flag scheme
(`salmon_biometric_enabled` / `..._key_exists` / `..._marker`,
`useBiometricAuth.ts:28-41`) collapses to one, so the toggle can no longer disagree with
reality.

### 6.5 Arming — three entry points, one function

`armBiometrics(password)` is the only writer. It requires the plaintext password, because
that is what it seals. Callers:

1. **Onboarding** (`app/(auth)/biometric-setup.tsx`) — has the password in flight.
2. **Settings → Security toggle** — must now open the existing password-confirmation gate
   (`packages/shared/src/hooks/usePasswordConfirm.ts`, already in the repo and already used
   by the private-key and backup panels) before arming. **This is the missing re-enrolment
   path and it is the highest-value single change in this spec.**
3. **After a password unlock, when `armed` is true but the seal is stale** — re-seal
   silently. Cheap, and closes the DEV-41 orphaning class for good.

`changePassword` must call `armBiometrics(newPassword)` when `armed`, instead of today's
`clearBiometricKey` (`panelRegistry.tsx:147`) — changing a password should not cost the user
Face ID.

### 6.6 Timeout policy

| Trigger                     | Behaviour                                                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppState → background`     | lock immediately (unchanged, `app/_layout.tsx:254-270`)                                                                                                                                            |
| `AppState → inactive`       | `SHIELDED` cover only — never lock (§6.2)                                                                                                                                                          |
| process death               | locked by construction (memory stash)                                                                                                                                                              |
| foreground inactivity       | **out of scope; explicitly not added** — see §10 Q4                                                                                                                                                |
| `DerivedKeyCache.expiresAt` | keeps its 5-minute TTL, in memory, and `isKeyCacheValid` is now enforced on **every** read of it — including the one at `useAccountsSecurity.ts:159-165`, which today checks only `key` and `salt` |

### 6.7 Cold-start routing

The lock screen becomes the app's entry surface for a returning user. Concretely: root
`_layout.tsx` routes to `(app)` when `state.accounts.length > 0`, **regardless of
`state.locked`** — the `(app)` layout already covers everything with `LockOverlay` while
locked (`(app)/_layout.tsx:231`), so this is safe. Remove the `!state.locked` condition at
`app/_layout.tsx:214` and remove `handleAccessExistingAccount`
(`app/(auth)/index.tsx:73-79`) along with the `assist` text link that calls it (`:116-121`).
`(auth)` then means only what its name says: no wallet yet.

### 6.8 Platform ownership map

| Concern                                                                                 | Owner                                          | Why                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seal/open primitives (`sealPassword`, `openSealedPassword`) over `secretbox`            | `packages/shared/src/crypto/biometric-seal.ts` | pure crypto, no platform API, unit-testable in Vitest, and the extension will want it if WebAuthn unlock is ever built                              |
| The `BiometricUnlockResult` discriminated union + `BiometricArmState` types             | `packages/shared/src/types/`                   | one contract both platforms name                                                                                                                    |
| Lock state machine (`LOCKED / PROMPTING / PASSWORD / UNLOCKED / SHIELDED`) as a reducer | `packages/shared/src/hooks/useLockMachine.ts`  | it is screen-flow logic, which `packages/shared/AGENTS.md` places in shared; it receives the biometric adapter injected and touches no platform API |
| `expo-secure-store` / `expo-local-authentication` calls                                 | `apps/mobile/src/security/biometricStore.ts`   | native modules — must not enter `packages/shared`, which stays RN-importable and DOM-importable                                                     |
| `AppState` wiring                                                                       | `apps/mobile/app/_layout.tsx`                  | RN API                                                                                                                                              |
| Lock UI (RN)                                                                            | `apps/mobile/src/components/LockOverlay/`      | RN render                                                                                                                                           |
| Lock UI (DOM twin)                                                                      | `packages/ui/src/components/LockScreen/`       | DOM render, on the same `LockScreenPropsBase` contract                                                                                              |
| Session key cache, `chrome.storage.session`                                             | `apps/extension/src/utils/sessionKeyCache.ts`  | extension runtime API                                                                                                                               |

`useLockMachine` takes an injected adapter of shape
`{ arm, unlock, disarm, probe }`. Mobile supplies the `expo-*` implementation; the
extension supplies a `probe: () => 'unavailable'` stub. `packages/shared` never imports a
native module — the rule at `packages/shared/AGENTS.md` holds.

---

## 7. The extension — what it shares and what it must not

The extension's unlock is **password-only and correct**. `LockPage`
(`apps/extension/src/pages/lock/LockPage.tsx:16-24`) explicitly documents that
`onUnlockWithCachedKey` is accepted and discarded, citing spec 013 decision 8: WebAuthn
unlock is separate work. `sessionKeyCache.ts:28` correctly enforces `isKeyCacheValid` on
read — the mobile biometric path is the only place in the repo that does not.

|                                                                                | Shared                              | Rationale                                                                                                                                |
| ------------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DerivedKeyCache`, `unlockAccounts`, `unlockWithCachedKey`, vault crypto       | **yes** — already shared, unchanged | one vault format, one KDF                                                                                                                |
| `LockScreenPropsBase` (`packages/shared/src/types/ui/lock-screen.ts`)          | **yes**                             | the twins contract; gains an optional `biometric?` field the DOM twin leaves undefined                                                   |
| `useLockMachine` reducer                                                       | **yes**                             | the extension gets the same `LOCKED → PASSWORD → UNLOCKED` path; `PROMPTING` and `SHIELDED` are simply unreachable with the stub adapter |
| `sealPassword` / `openSealedPassword`                                          | **yes**                             | pure; unused by the extension today, ready if WebAuthn lands                                                                             |
| Anything touching `expo-secure-store`, `expo-local-authentication`, `AppState` | **no**                              | native modules; would break the MV3 bundle                                                                                               |
| The extension's `chrome.storage.session` cache                                 | **no**                              | extension runtime; stays in `apps/extension`                                                                                             |

**The shared contract is the right seam** — but only after `useLockMachine` exists. Today
the seam is `unlockWithCachedKey`, which forces the caller to already hold a valid key
cache, which is precisely what pushed mobile into persisting a session object. Moving the
_machine_ into shared and leaving the _credential store_ per-platform puts the boundary
where the platform difference actually is.

`pnpm check:parity` covers `LockScreen` ↔ `LockContent` today; the contract change in
§6.8 must keep the `extends` relationship intact or CI blocks (`docs/ARCHITECTURE.md` §23-34).

---

## 8. Migration — nobody gets locked out

Hard constraint: this is self-custodial. A user whose only copy of their funds is this app
must survive the update even if every biometric artefact is destroyed.

**The safety property is structural, not procedural: the password always works.** The vault
in AsyncStorage is untouched by everything in this spec. Every migration path below ends at
"the user types their password", which is the same path they have today.

| Existing state on device                                        | After update                                                                                                 | User experience                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Old biometric key present, salt still matches (Face ID working) | detected, **transparently re-armed** on the next successful unlock (§6.5 path 3)                             | nothing changes; Face ID keeps working                                                |
| Old key present, salt orphaned (**DEV-41 population**)          | old records deleted, `armed = true` retained, one-time notice: "Turn Face ID back on in Settings → Security" | one password unlock, one toggle, fixed                                                |
| Key invalidated by the OS (**DEV-34 population**)               | detected as `invalidated`, records deleted, `armed = false`                                                  | the toggle now honestly reads off; re-arm from Settings                               |
| Never enrolled                                                  | nothing to migrate                                                                                           | unchanged                                                                             |
| Enrolled but the password is forgotten                          | unchanged — the seed phrase is the only recovery, as today                                                   | "Forgot password" still resets the wallet (`LockContent.tsx:364-389`), warning intact |

Migration runs **once**, keyed by a version marker, and is **fail-open**: any error while
reading legacy records is swallowed, records are deleted, `armed` is set false, and the
user lands on the password field. Deleting a biometric convenience can never fail into a
state that blocks the password. No migration step touches `STORAGE_KEYS.MNEMONICS`.

**Downgrade**: a user who rolls back to 1.1.0 finds no `salmon_biometric_key` and gets the
password field. Acceptable; funds intact.

**OTA constraint** (`apps/mobile/AGENTS.md` §"OTA updates cannot carry native modules"):
this ships **no new native module** — `expo-secure-store` and `expo-local-authentication`
are already in the binary. So it _can_ be an EAS Update. Verify against the installed
binary before publishing, per the repo checklist.

---

## 9. Implementation plan

Ordered, each step independently verifiable, each landing green before the next.

| #   | Task                                                                                                                                                                                                                                                     | Files                                                                                                                                                                                           | Verified by                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Reproduce DEV-41 in a test.** Vitest: arm with a key cache, re-salt the vault via the upgrade path, assert biometric unlock now fails. Red.                                                                                                            | `packages/shared/src/hooks/useAccountsSecurity.test.ts` (new case)                                                                                                                              | `pnpm turbo run test --filter=@salmon/shared` — the new test **fails**                                                                                 |
| 2   | **Seal primitives.** `sealPassword` / `openSealedPassword` over `secretbox`; random 32-byte wrap key. No callers yet.                                                                                                                                    | `packages/shared/src/crypto/biometric-seal.ts` + `.test.ts`, `crypto/index.ts`                                                                                                                  | Vitest: round-trip, wrong-key rejection, tampered-ciphertext rejection                                                                                 |
| 3   | **Result + arm-state contracts.** `BiometricUnlockResult` union, `BiometricArmState`, adapter interface. Types only.                                                                                                                                     | `packages/shared/src/types/biometric.ts`, `types/index.ts`                                                                                                                                      | `pnpm turbo run typecheck --filter=@salmon/shared`                                                                                                     |
| 4   | **Mobile credential store.** `arm` / `unlock` / `disarm` / `probe` against `expo-secure-store` + `expo-local-authentication`, with the `invalidated` vs `unavailable` disambiguation of §6.4, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, split `keychainService`. | `apps/mobile/src/security/biometricStore.ts` (new)                                                                                                                                              | Jest with `expo-secure-store` mocked: `null` + hardware-enrolled ⇒ `invalidated`; `null` + no hardware ⇒ `unavailable`; **no delete on `unavailable`** |
| 5   | **`useLockMachine` reducer** — the five states of §6.2, adapter injected, no platform API.                                                                                                                                                               | `packages/shared/src/hooks/useLockMachine.ts` + `.test.ts`, `hooks/index.ts`                                                                                                                    | Vitest: every transition, incl. `PROMPTING → cancelled → PASSWORD` leaving `armed` untouched                                                           |
| 6   | **Re-seal on unlock.** Wire arm path 3 (§6.5): after a successful password unlock with `armed`, re-seal. **Makes step 1's test pass.**                                                                                                                   | `packages/shared/src/hooks/useAccountsSecurity.ts`, `useAccountsSecurityHelpers.ts`                                                                                                             | step 1 goes green; full `@salmon/shared` suite green                                                                                                   |
| 7   | **Settings re-enrolment.** Toggle-on opens `usePasswordConfirm` then calls `armBiometrics`. Collapse three flags to one `armed`. `changePassword` re-arms instead of clearing.                                                                           | `apps/mobile/src/settings/panelRegistry.tsx`, `apps/mobile/src/components/SecurityPanel/`, `packages/ui/src/components/SecurityPanel/` (twin), `packages/shared/src/types/ui/security-panel.ts` | Jest: toggle-on without a password does **not** arm; with a correct password does. `pnpm check:parity`                                                 |
| 8   | **Rewire the lock screen** onto `useLockMachine`. Delete the `hasAutoPromptedBiometric` ref, the `setTimeout(400)`, the 30 s `Promise.race`, and the `eslint-disable` at `LockContent.tsx:256`. Surface the `invalidated` message.                       | `apps/mobile/src/components/LockOverlay/LockContent.tsx`, `types.ts`, `packages/ui/src/components/LockScreen/` (twin)                                                                           | `apps/mobile/src/components/LockOverlay/LockContent.test.tsx`; `pnpm check:parity`                                                                     |
| 9   | **Retire the old hook.** Delete `useBiometricAuth.ts` + its test once every consumer (`(app)/_layout.tsx`, `panelRegistry.tsx`, `(auth)/biometric-setup.tsx`, `PrivateKeyPanel`) reads the machine. Three copies of the state become one.                | those four files, `apps/mobile/hooks/useBiometricAuth.{ts,test.tsx}`                                                                                                                            | `pnpm turbo run typecheck lint test --filter=@salmon/mobile`                                                                                           |
| 10  | **`SHIELDED` cover** on `AppState → inactive`. Opaque, no lock, no loop.                                                                                                                                                                                 | `apps/mobile/app/_layout.tsx`, `apps/mobile/src/components/PrivacyShield/` (+ DOM twin or a `MOBILE_ONLY` entry with its reason)                                                                | Jest AppState simulation: `inactive` does **not** call `lockAccounts`                                                                                  |
| 11  | **Cold-start routing** (§6.7). Drop `!state.locked` from the redirect; delete `handleAccessExistingAccount` and the welcome text link.                                                                                                                   | `apps/mobile/app/_layout.tsx:214`, `apps/mobile/app/(auth)/index.tsx:73-79,116-121`                                                                                                             | `apps/mobile/__tests__/app/app-lock.test.tsx`: locked + accounts ⇒ routed to `(app)`, overlay mounted                                                  |
| 12  | **Migration** (§8), version-marked, fail-open.                                                                                                                                                                                                           | `apps/mobile/src/security/migrateBiometric.ts` (new), called from `(app)/_layout.tsx`                                                                                                           | Jest: each of the five rows of §8's table; assert `STORAGE_KEYS.MNEMONICS` is never written                                                            |
| 13  | **Localise** every new string, EN + ES, via `t()`. Never guess a Spanish string — follow `i18n-authoring`.                                                                                                                                               | `packages/shared/src/locales/{en,es}/translation.json`                                                                                                                                          | `pnpm check:i18n`                                                                                                                                      |
| 14  | **Device verification** (§10 checklist) on physical iPhone + Android.                                                                                                                                                                                    | —                                                                                                                                                                                               | manual, signed off by the owner                                                                                                                        |

Steps 1-6 are `packages/shared` and land without touching a screen. 7-11 are `apps/mobile`
plus their DOM twins. 12-14 close it out.

---

## 10. Test plan

### Vitest — `packages/shared`

- `biometric-seal.test.ts`: round-trip; wrong wrap key rejects; tampered ciphertext rejects;
  nonce is unique across calls.
- `useLockMachine.test.ts`: all transitions of §6.2; `cancelled` and `unavailable` leave
  `armed` untouched; `invalidated` clears it; `PROMPTING` is unreachable from `SHIELDED`.
- `useAccountsSecurity.test.ts`: **the DEV-41 regression** — arm, upgrade-re-salt, unlock
  with biometrics, assert success (fails on today's code). Plus: `isKeyCacheValid` is
  enforced on the cached-key path (an expired cache is rejected, closing the §6.6 gap at
  `useAccountsSecurity.ts:159-165`).
- `useAccountsSecurityHelpers.test.ts`: `changeStoredPassword` re-arms rather than clearing.

### Jest — `apps/mobile`

- `biometricStore.test.ts`: the `invalidated`/`unavailable` truth table of §6.4, with
  `expo-secure-store` and `expo-local-authentication` mocked. **The assertion that matters:
  `unavailable` performs no `deleteItemAsync`** — that is the DEV-34 destruction path.
- `LockContent.test.tsx`: `invalidated` renders the re-enrol message; `cancelled` renders
  no error; the Face ID button is hidden when `armed` is false.
- `app-lock.test.tsx`: `background` locks; `inactive` does not; locked + accounts routes
  into `(app)` (step 11).
- `security-panel-*.test.tsx`: toggle-on requires the password; toggle-off disarms and
  deletes both records.
- `migrateBiometric.test.ts`: the five rows of §8; the vault is never written.

Coverage target 80 % per the repo rule, weighted to the store and the machine — the
UI-state assertions are secondary (repo testing rule: functional over visual).

### Physical device only — **cannot be automated**

`expo-secure-store`'s own docs state simulators do not enforce biometric authentication on
read (`node_modules/expo-secure-store/src/SecureStore.ts:83`). **A simulator will pass every
one of these while the device fails.** That is why both bugs shipped. Each needs a real
device and a human:

1. Arm Face ID → force-quit → reopen → prompt appears and unlocks. **iPhone with Face ID.**
2. Arm → Settings → Face ID → **Reset Face ID** → re-enrol → reopen the app. Expect: the
   `invalidated` message, the toggle now off, and re-arming from Settings works. _This is
   DEV-34's exact reproduction._
3. Arm → change the password in Settings → reopen. Expect: Face ID still works (§6.5).
4. Arm on a build predating `37906da5` → update → password unlock → reopen. Expect: Face ID
   works. _This is DEV-41's exact reproduction._
5. Arm → lock the device screen → wake via notification → open the app. Expect:
   `unavailable`, password field, **and the enrolment survives** — reopening with the device
   unlocked prompts normally.
6. Add a fingerprint on Android → reopen. Expect: `invalidated`, handled identically.
7. App switcher shows the privacy cover, not balances (step 10).
8. Deny the Face ID permission at the OS level → expect `unavailable`, never a crash.

Maestro is deprecated in this repo (owner, and `apps/mobile/.maestro/AGENTS.md`), so these
stay manual and belong in `docs/QA-RUNBOOK.md`.

---

## 11. Open questions for the owner

1. **Does storing a reversible envelope of the unlock password in the keychain behind Face
   ID meet your security bar?** (§6.1.) It is what every mainstream mobile wallet does and
   it is strictly better than today's raw vault key in the same slot — but it is a
   deliberate change to what biometry protects, and this is a wallet. **Blocks §6 entirely.**

2. **On `invalidated`, disarm silently or notify?** Silent is calmer; a notice is the only
   thing that tells a DEV-34 user _why_ Face ID stopped and where to turn it back on.
   §6.4 assumes notify. **Blocks step 8.**

3. **Should a password change keep Face ID armed (§6.5) or force re-arming?** Keeping it is
   better UX and safe under the new design; forcing it is a defensible "the credential
   changed, prove yourself again" stance. Today's behaviour is neither — it silently
   destroys the key and leaves the toggle lying. **Blocks step 7.**

4. **Foreground inactivity auto-lock: add it, or keep background-only?** §6.6 keeps
   background-only, matching today. A wallet left open on a table currently stays unlocked
   indefinitely. Adding it is a small change on top of `useLockMachine` but it is a product
   decision with a real annoyance cost. **Does not block; decide before step 5.**

5. **Ship as an EAS Update or as a binary release?** No new native module is introduced, so
   an OTA is technically valid (§8) — but this rewrites the unlock path for every existing
   user, and an OTA reaches every binary sharing the `appVersion` runtime with no staged
   rollout. Recommendation: **binary release with a bumped version**, so the migration is
   gated by the store rollout. **Blocks step 14.**

---

## 12. What was built (2026-09-07)

Owner decisions on §11, taken before implementation:

| #   | Question                                           | Decision                                                |
| --- | -------------------------------------------------- | ------------------------------------------------------- |
| 1   | Sealed envelope of the password behind biometrics? | **Yes** — §6.1 as written                               |
| 2   | Silent disarm or notify on `invalidated`?          | **Notify**                                              |
| 3   | Password change: keep Face ID armed?               | **Re-arm automatically** under the new password         |
| 4   | Foreground inactivity auto-lock?                   | **Not now** — background-only, unchanged                |
| 5   | EAS Update or binary release?                      | **EAS Update**, made mandatory by a launch gate (below) |

### Built

- `packages/shared/src/crypto/biometric-seal.ts` — `generateWrapKey` /
  `sealPassword` / `openSealedPassword` over the existing `tweetnacl`
  secretbox. No new dependency. 9 Vitest cases.
- `packages/shared/src/types/biometric.ts` — `BiometricUnlockResult` (the
  `ok` / `cancelled` / `invalidated` / `unavailable` / `failed` union that is
  the whole DEV-34 fix), `BiometricCapabilities`, `BiometricStore`.
- `apps/mobile/src/security/biometricStore.ts` — the only caller of
  `expo-secure-store` / `expo-local-authentication`. Two records under two
  `keychainService` values, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, the
  `invalidated`-vs-`unavailable` disambiguation, and **no deletion on a thrown
  error**. 21 Jest cases.
- `apps/mobile/src/contexts/BiometricContext.tsx` — one provider above both
  route groups, replacing the three independent copies of the old hook's state.
- `apps/mobile/src/contexts/EnrolmentPasswordContext.tsx` — carries the
  password from the password step to the enrolment step in memory, so arming
  has something to seal. Never persisted, never a route param.
- Settings → Security toggle now opens the existing `ConfirmSheet` password
  gate and arms. **This is the re-enrolment path the app did not have.**
- `changePassword` re-arms under the new password (§6.5) instead of deleting
  the key and leaving the toggle lying. `useChangePassword` and
  `SecurityPanelPropsBase` now hand the new password to `onPasswordChanged`.
- `LockContent` rewired: one `runUnlock` for both routes, the `invalidated`
  notice, no 30-second `Promise.race`.
- Cold-start routing (§6.7): the `!state.locked` condition and the welcome
  screen's "access existing account" link are gone.
- `apps/mobile/src/security/biometricStore.ts → migrateLegacyRecords()` (§8),
  one-shot and fail-open: sweeps the four pre-rebuild records on every device,
  and reports whether the user had biometrics on so the lock screen can say
  once that it has to be set up again.
- `apps/mobile/src/updates/useMandatoryUpdate.ts` — the mandatory-update gate
  (below).
- EN + ES strings for all three new messages.

### Deliberately not built

- **`useLockMachine` in `packages/shared` (§6.8, step 5).** The extension's
  unlock is password-only and correct, so a shared five-state reducer would
  have exactly one consumer today. The state it was meant to unify — three
  copies of the biometric flag — is unified by the provider instead. Revisit
  when WebAuthn unlock makes the extension a real second consumer.
- **`SHIELDED` / the privacy cover (§6.2, step 10).** A real improvement (the
  app-switcher snapshot shows balances) but not one of these two bugs, and it
  touches the DOM-parity maps. Worth its own ticket.
- **Foreground inactivity auto-lock** — owner decision Q4.

### Mandatory update, as shipped

`expo-updates` was installed but never called, so its default behaviour
applied: fetch in the background, apply on the _next_ launch. A user who never
fully quits the app could stay on a broken build indefinitely. The gate makes
the update a precondition of the first render — check, fetch, reload — on both
platforms, which is as close to forced as either store allows for a JS-only
change.

Three properties, each with a test: **fails open** (any error and the app opens
on the installed build — nobody is locked out of their funds by an update
server), **bounded** (8s cap), and **inert in development**.

What it cannot do, and what the owner accepted: an OTA reaches every binary
sharing the `appVersion` runtime at once, with no staged rollout and no
percentage rollback. This diff adds no native module — `expo-secure-store`,
`expo-local-authentication` and `expo-updates` are all already in the 1.1.0
binary — so it is a valid OTA under `apps/mobile/AGENTS.md`. Verify that against
the installed binary before publishing.

### Verified

`typecheck`, `lint`, `test` green on `@salmon/shared`, `@salmon/ui`,
`@salmon/mobile`, `@salmon/extension`; `pnpm check:parity` 78 pairs, 0
findings. The physical-device checklist in §10 is **not** covered by any of
that and remains the release gate — a simulator passes all of it while a
device fails, which is why both bugs shipped.
