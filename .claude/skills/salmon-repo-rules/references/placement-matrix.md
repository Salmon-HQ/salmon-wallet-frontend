# Placement Matrix

## Decide by platform scope

- Logic, contract or token both apps read -> `packages/shared`
- A DOM component -> `packages/ui`, as the twin of the mobile one on a shared contract
- Used by `mobile` only, or depends on React Native / Expo / native OS APIs -> `apps/mobile`
- Used by only one platform -> that app

## Decide by artifact type

- Domain types -> `packages/shared/src/types/`
- Cross-platform semantic component contracts -> `packages/shared/src/types/ui/`
- Hooks shared across platforms -> `packages/shared/src/hooks/`
- Shared utilities -> `packages/shared/src/utils/`
- Theme tokens -> `packages/shared/src/theme/`
- Shared DOM components -> `packages/ui/src/components/`
- Mobile components -> `apps/mobile/src/components/`
- App-specific screens, flows, navigation, and platform integrations -> app-local

## Common decisions

- Semantic prop contract shared by mobile and DOM surfaces -> `packages/shared/src/types/ui`
- `CSSProperties` or DOM-only prop extensions -> `packages/ui/.../types.ts`
- `ViewStyle` or React Native-only prop extensions -> mobile-local types
- Native capability wrappers, navigation glue, and Expo modules -> `apps/mobile`
- Browser-extension API usage -> `apps/extension`
- Biometrics or native OS capability -> `apps/mobile`

## Anti-patterns

- Putting DOM-only concerns (`CSSProperties`, DOM events) into `packages/shared/src/types/ui`
- Putting business logic in `packages/ui/src/components`
- Putting React Native-only component code into `packages/ui`
- Creating app-local duplicates of shared hooks, types, or utils
- Moving platform-only hooks into `packages/shared`
