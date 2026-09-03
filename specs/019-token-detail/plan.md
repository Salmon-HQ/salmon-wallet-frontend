# Implementation Plan: Token detail and NFT detail screens

**Branch**: `feat/redesign-mobile-home` | **Spec**: [spec.md](./spec.md)

Blocked on spec deltas D4, D5, D7. Once ruled:

1. `hooks/useTokenDetail.ts` (mobile): lift the chart/coin-info effects out of `(tabs)/index.tsx` verbatim; input = `Token`, period; output = chart data, coin info, market data, loading, error.
2. `app/(app)/token/[id].tsx`: CORE 02 composition with kit primitives; resolves the token from `useMultiChainTokens` by id; redirects to `/` on unknown id.
3. Home: `handleTokenPress` → `router.push('/token/<id>')`; delete the sheet states and `TokenInformationSheet` render.
4. `app/(app)/nft/[id].tsx` (+ `send`, `burn` steps if D7 confirmed): move `NftDetailSheet` step bodies into `src/components/NftDetail/`; `NftsTab` pushes instead of opening the sheet.
5. Delete `TokenInformationSheet/`, `NftDetailSheet/`; update barrels, tests (`home-*`, `NftDetailSheet.test`, `TokenInfo.test`), Maestro.
6. Verify: `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/mobile`.

Agents: one implementation agent per screen (token, NFT) after rulings; `typescript-reviewer` + `security-reviewer` on the NFT send/burn move (transaction paths — no behaviour change allowed without human sign-off).
