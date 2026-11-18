import { sharedWith } from './sharedWith';

describe('sharedWith', () => {
  // The guard for the helper's premise: if a dependency of `@salmon/shared`
  // stops loading under Jest, this fails here, with the package named, rather
  // than in every test that builds on the real barrel.
  it('loads the real barrel and replaces only what it is given', () => {
    const replacement = () => 'mocked';
    const shared = sharedWith({ usePendingAction: replacement });

    expect(shared.usePendingAction).toBe(replacement);
    expect(typeof shared.useExplorerLink).toBe('function');
  });
});
