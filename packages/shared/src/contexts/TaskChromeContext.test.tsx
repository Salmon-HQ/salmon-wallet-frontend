/**
 * @vitest-environment jsdom
 *
 * The task-chrome contract both platforms mount: claims are counted, a
 * publisher torn down mid-task releases its claim, and the surface count adds
 * the provider's own `surface()` calls to the external bump.
 */
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TaskChromeProvider, useTaskChrome, useTaskChromeClaim } from './TaskChromeContext';

// This file selects jsdom through the docblock above, not through the project
// environment (`node`), so testing-library's automatic teardown is never
// registered for it: each render stayed in the document and the next
// `getByTestId` found several of the same element. Every case after the first
// was red on that, not on the contract it asserts.
//
// Registering this once in `vitest.setup.ts` does not work — the setup module
// and the test file resolve different `@testing-library/react` instances, so
// the cleanup registered there never sees this file's container. Ten more
// files under `packages/shared` pick jsdom the same way and share the gap
// without tripping it yet; each needs this line, or the suite needs one jsdom
// project rather than per-file docblocks.
afterEach(cleanup);

function ChromeState() {
  const { isTaskEngaged } = useTaskChrome();
  return <span data-testid="chrome">{isTaskEngaged ? 'engaged' : 'free'}</span>;
}

function Publisher({ engaged }: { engaged: boolean }) {
  const engage = useTaskChromeClaim();
  React.useEffect(() => {
    engage(engaged);
  }, [engage, engaged]);
  return null;
}

function SurfaceState() {
  const { surfaceKey } = useTaskChrome();
  return <span data-testid="surface">{String(surfaceKey)}</span>;
}

function Surfacer() {
  const { surface } = useTaskChrome();
  React.useEffect(() => surface(), [surface]);
  return null;
}

const chrome = () => screen.getByTestId('chrome').textContent;
const surfaceKey = () => screen.getByTestId('surface').textContent;

describe('TaskChromeContext', () => {
  it('engages the chrome while a flow holds a claim', () => {
    render(
      <TaskChromeProvider>
        <ChromeState />
        <Publisher engaged />
      </TaskChromeProvider>
    );
    expect(chrome()).toBe('engaged');
  });

  it('keeps the chrome engaged while any other claim is open', () => {
    // As a bare boolean, whichever flow released first pulled the chrome back
    // under a flow that was still running.
    const { rerender } = render(
      <TaskChromeProvider>
        <ChromeState />
        <Publisher engaged />
        <Publisher engaged />
      </TaskChromeProvider>
    );
    rerender(
      <TaskChromeProvider>
        <ChromeState />
        <Publisher engaged={false} />
        <Publisher engaged />
      </TaskChromeProvider>
    );
    expect(chrome()).toBe('engaged');
  });

  it('frees the chrome once the last claim is released', () => {
    const { rerender } = render(
      <TaskChromeProvider>
        <ChromeState />
        <Publisher engaged />
        <Publisher engaged />
      </TaskChromeProvider>
    );
    rerender(
      <TaskChromeProvider>
        <ChromeState />
        <Publisher engaged={false} />
        <Publisher engaged={false} />
      </TaskChromeProvider>
    );
    expect(chrome()).toBe('free');
  });

  it('releases a claim whose publisher unmounted mid-task', () => {
    function Host({ mounted }: { mounted: boolean }) {
      return (
        <TaskChromeProvider>
          <ChromeState />
          {mounted && <Publisher engaged />}
        </TaskChromeProvider>
      );
    }
    const { rerender } = render(<Host mounted />);
    expect(chrome()).toBe('engaged');
    act(() => rerender(<Host mounted={false} />));
    expect(chrome()).toBe('free');
  });

  describe('the surfacing', () => {
    it('bumps the key when a wait reports it has left', () => {
      render(
        <TaskChromeProvider>
          <SurfaceState />
          <Surfacer />
        </TaskChromeProvider>
      );
      expect(surfaceKey()).toBe('1');
    });

    it('counts the external bump too — a biometric unlock shows no wait', () => {
      const { rerender } = render(
        <TaskChromeProvider surfaceKey={1}>
          <SurfaceState />
        </TaskChromeProvider>
      );
      expect(surfaceKey()).toBe('1');
      rerender(
        <TaskChromeProvider surfaceKey={2}>
          <SurfaceState />
          <Surfacer />
        </TaskChromeProvider>
      );
      expect(surfaceKey()).toBe('3');
    });
  });
});
