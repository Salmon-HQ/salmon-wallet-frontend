export { SeedWordGrid } from './SeedWordGrid';
export { SeedWordInput } from './SeedWordInput';
export type { SeedWordInputProps } from './SeedWordInput';
export { SeedPhraseEntry } from './SeedPhraseEntry';
export type { SeedPhraseEntryProps } from './SeedPhraseEntry';
// The string handling is one implementation in @salmon/shared, shared with the
// DOM grid in packages/ui; re-exported here so mobile consumers keep one import
// path for the whole seed-entry surface.
export { distributePhrase, splitPhrase, SHORT_PHRASE, LONG_PHRASE } from '@salmon/shared';
