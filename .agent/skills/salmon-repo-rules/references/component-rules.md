# Shared DOM Component Rules

## Scope

- `packages/ui` is only for React DOM components used by `apps/extension`
- Do not put mobile-only UI here
- Do not put business logic-heavy flows here unless the logic has already been extracted

## Required structure

- `Component.tsx`
- `types.ts`
- `index.ts`

## Type ownership

- Semantic cross-platform contracts should come from `@salmon/shared`
- Local `types.ts` should extend those contracts when possible
- DOM-only styling and prop details stay local

## Styling

- Use tokens from `@salmon/shared`
- Do not hardcode design values unless there is a documented exception

## Exports

- Named exports only through the public barrel
- Keep folder barrel and package barrel aligned

## Size and split guidance

- Component over 250-300 lines: ask whether view or logic should be extracted
- If logic starts deciding product behavior, consider moving it out of `packages/ui/src/components`
