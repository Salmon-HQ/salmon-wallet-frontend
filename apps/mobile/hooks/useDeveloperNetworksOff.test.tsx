import { renderHook } from '@testing-library/react-native';

import { useDeveloperNetworksOff } from './useDeveloperNetworksOff';

describe('useDeveloperNetworksOff', () => {
  it('flips a stored true back off, once', () => {
    const toggle = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ on }: { on: boolean }) => useDeveloperNetworksOff(on, toggle),
      { initialProps: { on: true } }
    );
    expect(toggle).toHaveBeenCalledTimes(1);

    // The toggle persisted false; the next read is quiet.
    rerender({ on: false });
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('leaves a stored false alone', () => {
    const toggle = jest.fn().mockResolvedValue(undefined);
    renderHook(() => useDeveloperNetworksOff(false, toggle));
    expect(toggle).not.toHaveBeenCalled();
  });
});
