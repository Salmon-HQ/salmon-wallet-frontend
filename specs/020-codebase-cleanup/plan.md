# Implementation Plan: Codebase cleanup — mobile + shared

**Branch**: `feat/redesign-mobile-home` | **Spec**: [spec.md](./spec.md)

Waves are disjoint by file. Every agent: targeted edits only on shared files (`src/components/index.ts`, locale JSONs), no commits, verification green before reporting. The orchestrator commits per wave.

| Wave | Packages | Agent | Notes |
|---|---|---|---|
| 0 (done/in flight) | Settings panels A/B/C; WP1+WP2; WP4 | expo-react-native-expert, refactor-cleaner | C awaits security review |
| 1 | P1 delete dead · P4 SheetTitle · P7 StateBlock + Home legacy blocks · P8 rows + TokenLogo · WP3 locale keys | refactor-cleaner / expo-react-native-expert | P7/P8 use `semantic` directly |
| 2 | P2 token pass + new semantic groups (mobile-wide, excludes swap/bridge/onboarding grid; SeedPhrase/QRScanner token-swap only) | expo-react-native-expert ×2 split by directory | `contrast.test.ts` pinned before/after |
| 3 | P3 one skeleton · P5 token-detail cards · P9 one receipt | expo-react-native-expert | P3 before P5 |
| 4 | P6 NFTs tab + NftCard | expo-react-native-expert (opus) | last kit target |
| 5 | Spec 021 light theme: `createSemantic(mode)`, ThemeContext, `useThemedStyles`, 80-file migration, Appearance row, light shadows | expo-react-native-expert + architect | depends on P2 |
| 6 | CI parity run: `pnpm format:check`, `pnpm turbo run typecheck lint test` (all packages), `node scripts/check-i18n.mjs` | orchestrator | fix web/extension compile breaks minimally |
