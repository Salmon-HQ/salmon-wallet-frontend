/**
 * The Staking section and the stake accounts detail as kit blocks (spec 038),
 * built once here so each twin only renders the list (`BlockList`).
 */
import type { KitBlock } from '../types/ui/block-list';
import type { Token } from '../types/ui';
import type { StakeAccountCard } from './staking';

type Translate = (key: string) => string;

export function stakingSectionBlocks(
  {
    tokens,
    onPress,
    hiddenBalance,
  }: { tokens: Token[]; onPress?: (token: Token) => void; hiddenBalance?: boolean },
  t: Translate
): KitBlock[] {
  if (tokens.length === 0) return [];
  return [
    { kind: 'label', key: 'title', props: { variant: 'title', children: t('staking.title') } },
    ...tokens.map((token): KitBlock => ({
      kind: 'token',
      key: token.address,
      props: {
        testID: `staking-row-${token.address}`,
        token,
        onPress,
        hiddenBalance,
        blockchain: 'solana',
      },
    })),
  ];
}

export function stakeAccountsBlocks(
  {
    state,
    cards,
    onRetry,
  }: {
    state: 'loading' | 'error' | 'empty' | 'ready';
    cards: StakeAccountCard[];
    onRetry: () => void;
  },
  t: Translate
): KitBlock[] {
  if (state === 'loading') {
    return [
      {
        kind: 'skeleton',
        key: 'loading',
        props: { testID: 'stake-accounts-loading', count: 2, lines: 2 },
      },
    ];
  }
  if (state === 'error') {
    return [
      {
        kind: 'state',
        key: 'error',
        props: {
          testID: 'stake-accounts-error',
          tone: 'error',
          title: t('staking.detail.error'),
          onRetry,
          retryLabel: t('actions.retry'),
        },
      },
    ];
  }
  if (state === 'empty') {
    return [
      {
        kind: 'state',
        key: 'empty',
        props: { testID: 'stake-accounts-empty', tone: 'empty', title: t('staking.detail.empty') },
      },
    ];
  }
  return cards.map((card) => ({
    kind: 'facts',
    key: card.key,
    props: { testID: `stake-account-${card.key}`, title: card.title, rows: card.rows },
  }));
}
