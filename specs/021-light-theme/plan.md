# Implementation Plan: Light mode

**Branch**: `feat/redesign-mobile-home` | **Spec**: [spec.md](./spec.md) | **Depends on**: spec 020 P2 (mobile reads `semantic` only)

1. Shared, additive, dark-only visible change (one agent): `createSemantic(mode)` + light resolver map + status-ramp light steps + `contrast.test.ts` over both modes + `STORAGE_KEYS.APPEARANCE` + `ThemeContext` + barrel exports. Verify shared/ui/web/extension.
2. Mobile infrastructure (same agent): `useThemedStyles`, `ThemeProvider` mounted in `app/_layout.tsx` beside `CurrencyProvider` with `useColorScheme()`, navigation theme from mode, `ScalesBackground`/`DepthBackground` read the hook, flat light ground when mode is light.
3. Mobile migration (two–three agents in parallel, split by directory: `app/(app)/**` + `app/(auth)/**`; `src/components/A–M`; `src/components/N–Z` + `src/settings`): mechanical factory rewrite, no visual change in dark; each agent verifies mobile typecheck/lint/test.
4. Appearance setting (one agent): registry key `appearance`, selector panel, Settings row with the current value, locale keys, tests.
5. Verification: full CI parity set; manual dark/light pass by the owner on return.
