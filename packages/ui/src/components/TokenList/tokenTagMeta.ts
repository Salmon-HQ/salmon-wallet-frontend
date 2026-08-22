/**
 * What a token tag *means*, separated from how any one surface draws it.
 *
 * The tags arrive verbatim from the balance response (`Token.tags`, sourced
 * from the Jupiter token list via `salmon-api`) and are surfaced twice: as
 * compact badges beside the token name in a list row, and as a labelled grid
 * on the token detail screen. Only the drawing differs, so only the drawing
 * lives in the components — the label and, more importantly, the *weight* of
 * each tag lives here.
 *
 * `weight` is the whole point. Five saturated chips beside a token name is a
 * claim that all five change a decision, and they do not:
 *
 * - `signal` — a verification or risk fact a user should act on. Earns color,
 *   and is sorted to the front so it is never the one hidden in the overflow.
 * - `descriptive` — true, useful on the detail screen, and merely a category
 *   in a list row. Monochrome.
 *
 * Anything not listed here is treated as `descriptive` with no label, and a
 * row will not render it at all.
 */
export type TokenTagWeight = 'signal' | 'descriptive';

/** Which status ramp a `signal` tag takes. `descriptive` tags take none. */
export type TokenTagTone = 'positive' | 'caution' | 'negative';

export interface TokenTagMeta {
  /** i18n key; proper-noun tags (LST, Token-2022, Pump.fun, ...) stay literal */
  labelKey?: string;
  /** English fallback, and the label for proper nouns */
  label: string;
  weight: TokenTagWeight;
  tone?: TokenTagTone;
}

export const TOKEN_TAG_META: Record<string, TokenTagMeta> = {
  // --- Verification & trust: the token is who it says it is -----------------
  verified: {
    label: 'Verified',
    labelKey: 'token.badges.verified',
    weight: 'signal',
    tone: 'positive',
  },
  strict: {
    label: 'Strict',
    labelKey: 'token.badges.strict',
    weight: 'signal',
    tone: 'positive',
  },
  // --- Risk: the token is retired, or is not the mint you think it is ------
  deprecated: {
    label: 'Deprecated',
    labelKey: 'token.badges.deprecated',
    weight: 'signal',
    tone: 'negative',
  },
  duplicate: {
    label: 'Duplicate',
    labelKey: 'token.badges.duplicate',
    weight: 'signal',
    tone: 'caution',
  },

  // --- Descriptive: category, provenance, product ---------------------------
  major: { label: 'Major', labelKey: 'token.badges.major', weight: 'descriptive' },
  'moonshot-verified': {
    label: 'Moonshot',
    labelKey: 'token.badges.moonshot',
    weight: 'descriptive',
  },
  community: { label: 'Community', labelKey: 'token.badges.community', weight: 'descriptive' },
  'community-assist': {
    label: 'Community Assist',
    labelKey: 'token.badges.communityAssist',
    weight: 'descriptive',
  },
  lst: { label: 'LST', weight: 'descriptive' },
  'original-lst': {
    label: 'Original LST',
    labelKey: 'token.badges.originalLst',
    weight: 'descriptive',
  },
  stable: { label: 'Stablecoin', labelKey: 'token.badges.stablecoin', weight: 'descriptive' },
  'token-2022': { label: 'Token-2022', weight: 'descriptive' },
  yb: { label: 'Yield Bearing', labelKey: 'token.badges.yieldBearing', weight: 'descriptive' },
  launchpad: { label: 'Launchpad', labelKey: 'token.badges.launchpad', weight: 'descriptive' },
  moonshot: { label: 'Moonshot', labelKey: 'token.badges.moonshot', weight: 'descriptive' },
  'birdeye-trending': {
    label: 'Trending',
    labelKey: 'token.badges.trending',
    weight: 'descriptive',
  },
  'pumpfun-graduates': { label: 'Pump.fun', weight: 'descriptive' },
  'jup-lend-earn': { label: 'Jupiter Lend', weight: 'descriptive' },
  prestocks: { label: 'Pre-stocks', labelKey: 'token.badges.preStocks', weight: 'descriptive' },
  xstocks: { label: 'X-stocks', labelKey: 'token.badges.xStocks', weight: 'descriptive' },
  'old-registry': {
    label: 'Legacy Registry',
    labelKey: 'token.badges.legacyRegistry',
    weight: 'descriptive',
  },
  'solana-fm': { label: 'Solana FM', weight: 'descriptive' },
  wormhole: { label: 'Wormhole', weight: 'descriptive' },
  deduplicated: {
    label: 'Deduplicated',
    labelKey: 'token.badges.deduplicated',
    weight: 'descriptive',
  },
  internal: { label: 'Internal', labelKey: 'token.badges.internal', weight: 'descriptive' },
};

/** Signals first, then original order. Stable, so equal weights never shuffle. */
export function sortTagsBySignalFirst(tags: readonly string[]): string[] {
  return [...tags].sort((a, b) => {
    const aSignal = TOKEN_TAG_META[a]?.weight === 'signal' ? 0 : 1;
    const bSignal = TOKEN_TAG_META[b]?.weight === 'signal' ? 0 : 1;
    return aSignal - bSignal;
  });
}
