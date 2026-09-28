# Mobile Test Patterns

## Commands

```bash
pnpm --filter @salmon/mobile test
pnpm --filter @salmon/mobile test -- WalletHeader
pnpm --filter @salmon/mobile test:coverage
```

## Current setup

- Test runner: Jest with `jest-expo`
- RN testing library: `@testing-library/react-native`
- Setup file: `apps/mobile/jest.setup.js`
- Preset and transforms: `apps/mobile/jest.config.js`

## File placement

- Prefer `Component.test.tsx` next to the component
- Keep setup local to the file unless the repo already has a shared helper
- Test the public module export by default

## Baseline pattern

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from './PrimaryButton';

describe('PrimaryButton', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton onPress={onPress}>Continue</PrimaryButton>
    );

    fireEvent.press(getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

Use this for simple callback-driven components such as `PrimaryButton`.

## RN-specific mocking guidance

- Mock `react-i18next` minimally when the component uses `useTranslation()`
- Mock `useSafeAreaInsets` only when layout depends on it
- Mock Expo modules only when they block the test from rendering
- Prefer real props and visible assertions over deep implementation mocks

## Real repo targets

- Simple interaction: `Button`, `StepIndicator`
- Callback + accessibility: `WalletHeader`
- Platform split behavior: `QRCode`, `QRScanner`, `LoadingScreen`
- Complex flows that deserve focused slices instead of broad coverage: `SendSheet`, `Activity`

## Smells

- No tests for callback-heavy or accessibility-heavy mobile components
- Tests asserting internal state or styles instead of visible behavior
- Broad mocks that hide whether a user interaction actually works
- Snapshot-heavy coverage replacing targeted render or interaction tests
