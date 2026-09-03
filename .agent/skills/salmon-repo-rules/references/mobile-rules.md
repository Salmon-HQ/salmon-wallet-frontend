# Mobile Component Rules

## Scope

- `apps/mobile/src/components` is for React Native UI and mobile-only presentation logic
- Native integrations, Expo modules, navigation glue, and device capabilities stay in `apps/mobile`
- Do not move React Native UI into `packages/ui`

## Ownership

- Use a shared semantic contract from `packages/shared/src/types/ui` only when the same component or flow also exists outside mobile
- Keep mobile-only prop types local to the component folder
- Extend shared contracts with `ViewStyle` or React Native-only props inside mobile-local `types.ts`

## Required structure

- Public mobile components usually use `Component.tsx`, `types.ts`, and `index.ts`
- The RN file is the only file; there is no web target for mobile any more
- Export public components from `apps/mobile/src/components/index.ts`

## Styling

- Use `StyleSheet.create`
- Use tokens and helpers from `@salmon/shared`
- Avoid hardcoded colors, spacing, and font sizes unless the design token layer truly does not cover the case

## Common smells

- Duplicating semantic prop fields locally instead of extending a shared contract
- Mixing business logic, navigation, and native capability orchestration into a presentational component
- React Native-only components added to `packages/shared/src/types/ui` without a real cross-platform need
- Public mobile components missing barrel exports
