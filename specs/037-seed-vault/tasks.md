# Tasks: Seed Vault accounts (037)

## Phase 1 — One signing path (shared, no behaviour change)
- [x] T001 RED/GREEN `blockchain/solana/signing.ts`: `signTransactionWith`, `signBytesWith`; a KeyPairSigner signs byte-identically to `partiallySignTransaction` / `signBytes`
- [x] T002 Route the six call sites through the helpers; widen `SolanaAccount.signer`; golden and extension suites unchanged

## Phase 2 — Seed Vault signer and account kind (shared)
- [x] T003 RED/GREEN `seed-vault-signer.ts`: message bytes to the bridge, signature merge, chunking, typed errors (cancelled, revoked, unavailable)
- [x] T004 `AccountSecret` `seedVault`; restore builds Solana accounts with the signer; private-key export only on key-holding accounts
- [x] T005 Copy `wallet.seedVault.*` EN + ES

## Phase 3 — App (mobile)
- [x] T006 Add `@solana-mobile/seed-vault-lib` 0.4.1; `src/seed-vault/bridge.ts` adapter (availability secure-only in production)
- [x] T007 Config plugin guard: build fails if the privileged permission is in the manifest
- [x] T008 Add flow from Add wallet and the welcome screen; accounts picker; duplicates shown as added
- [x] T009 Removal deauthorizes the last wallet of a seed; revoked access refuses with re-authorize offer
- [x] T010 No lock while a Seed Vault confirmation is open (main app and MWA root)

## Phase 4 — Verification
- [x] T011 Simulator on `Seeker_API35`: add, send on devnet, MWA request types, cancel, revoke
- [x] T012 Maestro flow `seed-vault.yaml`
- [ ] T013 Gates: typecheck, lint, shared/mobile/ui/extension suites; manifest check
