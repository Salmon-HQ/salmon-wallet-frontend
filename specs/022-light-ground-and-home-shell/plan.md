# Plan — spec 022

Three lots, independent after the `withAlpha` helper lands (committed first).

| Lot                                   | Files                                                                                                                                                                                                                                                                                                                                | Verify                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| A — tokens + ground + Home shell      | `semantic.ts` (`water.gradient` light, `water.fadeTop/fadeBottom`, `surface.raisedFade`), `contrast.test.ts`, `semantic.test.ts`, `(tabs)/_layout.tsx`, `DepthBackground.tsx`, `WalletHeader.tsx`, `(tabs)/index.tsx`, `NftsTab.tsx`, `NftsTabHeader.tsx`, `useTabChrome.ts`, their tests, DESIGN.md §Navigation / §The water column | shared + mobile typecheck lint test      |
| B — thermocline in light + sheet fade | `Thermocline.tsx`, `Thermocline.native.tsx`, `Thermocline.test.tsx`, `BottomSheetContainer.tsx`                                                                                                                                                                                                                                      | mobile typecheck lint test               |
| C — coral on the wait and the lock    | `motion/crest.ts`, mobile `LoadingScreen.tsx`, `packages/ui` `LoadingScreen.tsx`, `LockContent.tsx`, DESIGN.md §The wait                                                                                                                                                                                                             | shared + ui + mobile typecheck lint test |

Lot B does not touch `semantic.ts` (A owns it); it reads `surface.raised` + `withAlpha` directly until A's `surface.raisedFade` exists, then A swaps it. Lot C does not touch `semantic.ts` either; it reports whether `water.light` still has a consumer.

Close: `pnpm format:check`, full turbo `typecheck lint test`, `node scripts/check-i18n.mjs`; one commit per lot.
