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

const chrome = () => screen.getByTestId('chrome').props.children;

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
});
