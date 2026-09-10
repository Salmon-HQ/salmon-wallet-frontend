import { configure } from '@testing-library/react';

// `waitFor` gives up after 1s by default. Under coverage on a cold 2-core CI
// runner a first render of a page can take longer than that, which makes an
// assertion on a state that does arrive flake. Same reasoning as the
// `testTimeout` in vitest.config.ts: wait long enough to mean something.
configure({ asyncUtilTimeout: 5000 });
