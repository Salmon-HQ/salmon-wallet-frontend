# Feature Specification: Codebase cleanup — mobile + shared

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `020-codebase-cleanup`)
**Created**: 2026-09-01 · **Status**: In progress (owner away; rulings marked ⚠ need review on return)

Owner's brief (2026-09-01): "pasar en limpio los componentes y unificar los similares con props, para tener una codebase ordenada, limpia y evitar estilos hardcodeados". Scope: `apps/mobile` + `packages/shared` only; extension/web later (owner allows breaking exports only they consume, **but CI must stay green**, and CI typechecks/tests every package — so web/extension keep compiling). Swap/bridge are off-limits (listed, untouched). Maestro is deprecated: flows are neither run nor maintained. The light theme (spec 021) lands last and depends on this spec.

Sources: `research-shared.md`, `research-mobile.md` (two read-only audits, 2026-09-01).

## Requirements
- FR-001 No hardcoded style in `apps/mobile` outside documented exceptions (QR contrast inks, SVG mask stops): every colour through `semantic.*`, every size through the theme scales with `s()`/`vs()`/`ms()`, every sibling seam the 20 component gap.
- FR-002 The legacy `colors.*` palette has zero mobile consumers; `semantic` is the single colour layer mobile reads. Groups the legacy palette covered and `semantic` did not get semantic tokens (see rulings).
- FR-003 One implementation per job: skeletons, sheet titles, empty/error states, receipts, rows, token-detail cards, address inputs.
- FR-004 Dead code deleted (zero-consumer components, tokens, contracts, locale keys, barrel exports), preserving every Ethereum-named surface (AGENTS.md rule 5) and the contract surfaces DESIGN.md names as needing human sign-off.
- FR-005 Behaviour unchanged everywhere; security-sensitive components (`SeedPhrase`, `QRScanner` camera path, panels) get token swaps only.
- FR-006 Verification per package: `pnpm turbo run typecheck lint test` on shared/ui/mobile after each package; the full CI set (`format:check`, all-package `typecheck lint test`, `scripts/check-i18n.mjs`) at the end.

## Rulings taken while the owner was away ⚠
- **New semantic groups** (added to `packages/shared/src/theme/semantic.ts`, mapped to the existing ramp, with contrast assertions): `skeleton.base/highlight` (surface.raised / surface.crest), `input.ground/edge` (surface.raised / border.default), `overlay.backdrop/scrim` (depth.abyss at the sheet/dialog alphas already in `colors`), `sheet.handle` (text.tertiary), `step.active/inactive` (accent.ink / border.default), `scanner.ground/frame/corner/hint` (depth tokens replacing the off-palette `#1a1a2e` family). `colors.palette.*` (per-chain brand marks) moves to `brand.ts` as `chainMarks`. These are the eight groups the audit could not migrate mechanically; the owner reviews the mapping on return.
- **DESIGN.md drift**: `accent.inkOnMembrane` / `text.onGlass` have no renderer (DESIGN.md:224 says shipped). Left in place per the audit's warning; flagged for the owner.
- **`(tabs)/_layout.tsx` is a Stack wearing a Tabs costume**: navigation change, not styling — left for an explicit ruling.

## Work packages (see plan.md for order and agents)
Shared: WP1 dead theme tokens · WP2 dead ui contracts · WP3 dead locale keys · WP4 `useTokenDetail` → `useCoinMarketData` · WP5 = mobile P2 (colors → semantic).
Mobile: P1 delete dead · P2 token pass (+ new semantic groups) · P3 one skeleton · P4 one sheet title · P5 token-detail cards shared with Home's Bitcoin column · P6 NFTs tab + NftCard on the kit · P7 shared empty/error state + Home's legacy blocks · P8 row consolidation · P9 one receipt.
Kit gaps found by the settings rewrite, folded into P2/P8: `ListRow`/`Card` accept `accessibilityRole="link"`; `RecipientInput` takes a `testID` prefix instead of the send flow's fixed ids; `WarningNotice` accepts `testID`; `SettingsScreenLayout` gets a footer slot for a sticky action.
