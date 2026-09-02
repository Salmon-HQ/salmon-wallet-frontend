# Core Rules

## Package ownership

- `packages/shared`: only code shared by `mobile`, `web`, and `extension`
- `packages/ui`: only shared React DOM components for `web` and `extension`
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

- Shared by all three platforms -> `packages/shared`
- Shared only by `web` and `extension` and is DOM UI -> `packages/ui`
- Shared only by one platform -> keep it in that app
- Semantic cross-platform props -> `packages/shared/src/types/ui`
- Visual or platform-specific props -> local `types.ts`

## Refactor thresholds

- Hook over 300 lines: question whether it should be split
- Component over 250-300 lines: question whether view, logic, or subcomponents should be extracted
