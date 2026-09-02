/**
 * The mark and the wordmark read the shared contract whole; nothing
 * platform-specific is added on native. `BrandMark.tsx` and `Wordmark.tsx`
 * declare these same shapes inline today — the next touch on those files
 * points them here.
 */
import type { BrandMarkPropsBase, WordmarkPropsBase } from '@salmon/shared';

export type BrandMarkProps = BrandMarkPropsBase;
export type WordmarkProps = WordmarkPropsBase;
