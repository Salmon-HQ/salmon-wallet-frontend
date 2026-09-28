# UI Test Patterns

## Commands

```bash
pnpm --filter @salmon/ui test
pnpm --filter @salmon/ui test -- WalletHeader
pnpm --filter @salmon/ui test:coverage
```

## File placement

- Prefer `Component.test.tsx` next to the component folder
- Add `@vitest-environment jsdom` at the top of DOM-rendering tests
- Keep local setup inside the test file unless a shared helper already exists

## Baseline pattern

```tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders one dot per step', () => {
    const { container } = render(<StepIndicator totalSteps={3} currentStep={2} />);
    expect(container.firstChild?.childNodes).toHaveLength(3);
  });
});
```

Use this style for simple, presentational components such as `StepIndicator`.

## Interaction-heavy pattern

For components like `ConfirmDialog` or `WalletHeader`:

- Prefer `@testing-library/react` plus `@testing-library/user-event`
- Mock `react-i18next` minimally when the component uses `useTranslation()`
- Assert visible text, callbacks, accessibility labels, and conditional rendering
- Do not assert token values, generated class names, or Emotion internals

## Mocking guidance

- Mock only the dependency that blocks the test
- Keep translation mocks tiny, for example `t: (key, fallback) => fallback ?? key`
- Prefer inline mocks per file because `packages/ui` does not yet have a mature shared test harness

## Real repo targets

- Render-only: `StepIndicator`
- Callback/a11y: `WalletHeader`
- Conditional rendering and async interaction: `ConfirmDialog`
- Complex flows that deserve selective coverage: `SendPage`, `ActivityPage`

## Smells

- No tests for a behavior-heavy shared component
- Assertions coupled to implementation details instead of behavior
- Snapshot-heavy tests used instead of focused render or interaction assertions
