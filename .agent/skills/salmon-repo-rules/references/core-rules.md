# Core Rules

## Package ownership

- `packages/shared`: code shared by `mobile` and `extension` — logic, contracts, tokens, the screen-flow hooks and contexts
- `packages/ui`: the extension's React DOM kit, twin for twin with `apps/mobile/src/components`
- `apps/mobile`: React Native-only UI and platform-specific logic
- `apps/extension`: extension-only pages, flows, and browser-extension logic

## Shared code placement

- Domain types: `packages/shared/src/types/`
- Cross-platform component contracts: `packages/shared/src/types/ui/`
- Hooks: `packages/shared/src/hooks/`
- Utils: `packages/shared/src/utils/`
- API services: `packages/shared/src/api/services/`
- Theme tokens: `packages/shared/src/theme/`
- Contexts: `packages/shared/src/contexts/`

## Decision shortcuts

- Needed by both apps and does not draw -> `packages/shared`
- Draws on the DOM -> `packages/ui`, with its mobile twin on one contract
- Shared only by one platform -> keep it in that app
- Semantic cross-platform props -> `packages/shared/src/types/ui`
- Visual or platform-specific props -> local `types.ts`

## Refactor thresholds

- Hook over 300 lines: question whether it should be split
- Component over 250-300 lines: question whether view, logic, or subcomponents should be extracted
