import { renderHook, act } from '@testing-library/react-native';

import { setMwaSessionOpen, useMwaSessionOpen } from './sessionOpen';

// A dApp can reopen the activity while the previous one is still closing: the
// old session's close must not clear the new session's mark.
it('stays open while any session is still open', () => {
  const { result } = renderHook(() => useMwaSessionOpen());
  act(() => {
    setMwaSessionOpen(true);
    setMwaSessionOpen(true);
    setMwaSessionOpen(false);
  });
  expect(result.current).toBe(true);
  act(() => setMwaSessionOpen(false));
  expect(result.current).toBe(false);
});
