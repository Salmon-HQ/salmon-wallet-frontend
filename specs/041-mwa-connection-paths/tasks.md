# Tasks: A dApp connection that does not dead-end (Mobile Wallet Adapter)

**Input**: Design documents from `specs/041-mwa-connection-paths/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational (shared decision logic)

- [ ] T001 Write failing Vitest cases for `mwaNetworkGate` and the precheck's `network-unsupported` reason in `packages/shared/src/utils/mwa.test.ts`
- [ ] T002 Implement `mwaNetworkGate` and split the precheck's network reason in `packages/shared/src/utils/mwa.ts`; export from `packages/shared/src/utils/index.ts` alongside the other `mwa*` helpers
- [ ] T003 [P] Add the `dapp.mwa_*` keys (switch title/message/button, no-wallet title/message/button, unsupported message, network names) to `packages/shared/src/locales/en/translation.json` and `.../es/translation.json`

## Phase 2: User Story 1 — switch to the network the dApp asks for (P1) 🎯

- [ ] T004 [US1] Write failing Jest cases in `apps/mobile/src/mwa/MwaRoot.test.tsx`: a devnet request on a mainnet wallet shows the switch sheet; Switch calls `changeNetwork('solana-devnet')`; Cancel answers declined without switching
- [ ] T005 [US1] Render the switch gate in `MwaHost` (`apps/mobile/src/mwa/MwaRoot.tsx`) with `ConfirmSheet`, after the lock and before `MwaRequest`

## Phase 3: User Story 2 — no wallet yet (P1)

- [ ] T006 [US2] Jest cases in `MwaRoot.test.tsx`: with no accounts any request shows the no-wallet sheet; Open Salmon opens `salmonwallet://` then declines; Close declines
- [ ] T007 [US2] Render the no-wallet gate in `MwaHost`, before the lock

## Phase 4: User Story 3 — unsupported network (P2)

- [ ] T008 [US3] Show the `network-unsupported` message in `apps/mobile/src/mwa/MwaRequest.tsx` (acknowledge-only `ConfirmSheet`, as today's refusals)

## Phase 5: Polish & verification

- [ ] T009 `pnpm typecheck`, `pnpm lint` (zero warnings), Vitest in `packages/shared`, Jest in `apps/mobile`
- [ ] T010 Run `quickstart.md` on `Seeker_API35` against a release build; record results in `research.md`
- [ ] T011 Trace any new `testID` through `apps/mobile/.maestro`; add the devnet switch to the MWA Maestro coverage

## Dependencies

T001 → T002 → (T004, T006, T008); T003 before T005/T007/T008; T009–T011 last.
