import { configure } from '@testing-library/react';
import { afterEach } from 'vitest';
// The storage module itself, not the `@salmon/shared` barrel: importing the
// barrel here would evaluate it before a test file's `vi.mock` of it, and
// the partial mocks the page tests rely on would never apply.
import { createLocalStorageAdapter, initStorage } from '../../../shared/src/storage/storage';

// `waitFor` gives up after 1s by default. Under coverage on a cold 2-core CI
// runner a first render of a page can take longer than that, which makes an
// assertion on a state that does arrive flake. Same reasoning as the
// `testTimeout` in vitest.config.ts: wait long enough to mean something.
configure({ asyncUtilTimeout: 5000 });

// The apps initialise storage before any provider mounts, so the shared
// ThemeProvider and CurrencyProvider assume it. A kit test renders them
// without an app: give them jsdom's localStorage (the adapter reads `window`
// lazily, so files that run in node are unaffected) and start every test
// with it empty.
initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
afterEach(() => {
  if (typeof window !== 'undefined') window.localStorage.clear();
});
