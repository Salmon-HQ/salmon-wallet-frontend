# Mobile Component Scaffold Patterns

## Decide the branch first

Use the mobile-only branch when the component belongs only in `apps/mobile`.

Use the cross-platform branch when:

- a semantic contract should live in `packages/shared/src/types/ui`
- the component already exists or should exist outside mobile
- the same props and behavior need to stay aligned between mobile and DOM

## Branch A: Mobile-only component

Create or update these files:

1. `apps/mobile/src/components/{ComponentName}/types.ts`
2. `apps/mobile/src/components/{ComponentName}/{ComponentName}.tsx`
3. `apps/mobile/src/components/{ComponentName}/index.ts`
4. `apps/mobile/src/components/index.ts`

Typical local type:

```typescript
import type { ViewStyle } from 'react-native';

export interface ComponentNameProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
}
```

## Branch B: Cross-platform contract + mobile implementation

Create or update these files:

1. `packages/shared/src/types/ui/{component-name}.ts`
2. `packages/shared/src/types/ui/index.ts`
3. `apps/mobile/src/components/{ComponentName}/types.ts`
4. `apps/mobile/src/components/{ComponentName}/{ComponentName}.tsx`
5. `apps/mobile/src/components/{ComponentName}/index.ts`
6. `apps/mobile/src/components/index.ts`

Mobile extension:

```typescript
import type { ViewStyle } from 'react-native';
import type { ComponentNamePropsBase } from '@salmon/shared';

export interface ComponentNameProps extends ComponentNamePropsBase<ViewStyle> {}
```

## Implementation rules

- Use `StyleSheet.create`
- Use tokens and helpers from `@salmon/shared`
- Keep Expo and RN capability code in mobile
- Add `.native.tsx` / `.web.tsx` only when behavior genuinely differs
- Export public components from `apps/mobile/src/components/index.ts`

## Platform-split patterns

Reach for platform-specific files when rendering or native capabilities differ:

- `QRCode/QRCode.native.tsx` + `QRCode/QRCode.tsx`
- `QRScanner/QRScanner.native.tsx` + `QRScanner/QRScanner.tsx`
- `LoadingScreen/LoadingScreen.tsx` + `LoadingScreen/LoadingScreen.web.tsx`

## Real repo examples

- Mobile-only: `Button`, `TopSheet`, `ConfirmSheet`, `SubAccountSelector`
- Cross-platform with shared contract: `WalletHeader`, `StepIndicator`, `ReceiveSheet`, `PriceChart`
- Platform split: `QRCode`, `QRScanner`, `LoadingScreen`, `GlassTabBar`
- Complex families: `SendSheet`, `SwapScreen`, `Activity`

## Verification

```bash
pnpm --filter @salmon/mobile typecheck
```
