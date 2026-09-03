# UI Component Scaffold Patterns

## Decide the branch first

Use the DOM-only branch when the component has no mobile twin (listed in `scripts/check-dom-parity.mjs` `DOM_ONLY` with a reason), so no reusable semantic contract is needed outside `packages/ui`.

Use the cross-platform branch when:

- mobile already has or will have a parallel component
- a semantic contract belongs in `packages/shared/src/types/ui`
- the same behavior and props should stay aligned across DOM and React Native

## Branch A: DOM-only component in `packages/ui`

Create or update these files:

1. `packages/ui/src/components/{ComponentName}/types.ts`
2. `packages/ui/src/components/{ComponentName}/{ComponentName}.tsx`
3. `packages/ui/src/components/{ComponentName}/index.ts`
4. `packages/ui/src/components/index.ts`

Use local props when a shared contract would add no value:

```typescript
import type { CSSProperties, ReactNode } from 'react';

export interface ComponentNameProps {
  title: ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

## Branch B: Cross-platform contract + DOM implementation

Create or update these files:

1. `packages/shared/src/types/ui/{component-name}.ts`
2. `packages/shared/src/types/ui/index.ts`
3. `packages/ui/src/components/{ComponentName}/types.ts`
4. `packages/ui/src/components/{ComponentName}/{ComponentName}.tsx`
5. `packages/ui/src/components/{ComponentName}/index.ts`
6. `packages/ui/src/components/index.ts`

Shared semantic contract:

```typescript
export interface ComponentNamePropsBase<TStyle> {
  label: string;
  onPress?: () => void;
  style?: TStyle;
}
```

DOM extension:

```typescript
import type { CSSProperties } from 'react';
import type { ComponentNamePropsBase } from '@salmon/shared';

export interface ComponentNameProps extends ComponentNamePropsBase<CSSProperties> {
  className?: string;
}
```

Use a non-generic shared contract only when the props are fully platform-agnostic, as in `StepIndicatorProps`.

## Implementation rules

- Import `styled` from `../../utils/styled`, not from `@salmon/ui`
- Import tokens and helpers from `@salmon/shared`
- Keep business logic out of the component; extract it first if needed
- Use named exports only
- Add extra files only when the component is complex enough to justify them

## Real repo examples

- DOM-only: `ConfirmDialog`, `PageShell`, `BaseDialog`
- Cross-platform with shared contract: `WalletHeader`, `BalanceCard`, `InputAddress`
- Shared contract without `TStyle`: `StepIndicator`
- Complex component families: `SendPage`, `SwapScreen`

## Verification

```bash
pnpm turbo run typecheck --filter=@salmon/shared --filter=@salmon/ui
```
