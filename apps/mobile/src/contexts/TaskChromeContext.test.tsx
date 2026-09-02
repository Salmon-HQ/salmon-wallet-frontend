import React from 'react';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';

import { TaskChromeProvider, useTaskChrome, useTaskChromeClaim } from './TaskChromeContext';

function ChromeState() {
  const { isTaskEngaged } = useTaskChrome();
  return <Text testID="chrome">{isTaskEngaged ? 'engaged' : 'free'}</Text>;
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
  return <Text testID="surface">{String(surfaceKey)}</Text>;
}

function Surfacer() {
  const { surface } = useTaskChrome();
  React.useEffect(() => surface(), [surface]);
  return null;
}

const chrome = () => screen.getByTestId('chrome').props.children;
const surfaceKey = () => screen.getByTestId('surface').props.children;

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
    // The regression this guards: as a bare boolean, whichever flow released
    // first pulled the chrome back under a flow that was still running.
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
    // A flow torn down while engaged used to leave the shell headless.
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
      // One count, two channels: the prop the app layout owns and the
      // `surface()` calls every wait makes.
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
