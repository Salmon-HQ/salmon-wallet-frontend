/**
 * The SKR tab as kit blocks (spec 039), built once so each twin only renders
 * the list (`BlockList`).
 */
import type { KitBlock } from '../../types/ui/block-list';
import type { UseSkrScreenLogicResult } from './useSkrScreenLogic';

export function skrBlocks(
  { state, summary, history, refresh, chart }: UseSkrScreenLogicResult,
  t: (key: string) => string
): KitBlock[] {
  if (state === 'loading') {
    return [
      { kind: 'skeleton', key: 'loading', props: { testID: 'skr-loading', count: 4, lines: 2 } },
    ];
  }
  if (state === 'error') {
    return [
      {
        kind: 'state',
        key: 'error',
        props: {
          testID: 'skr-error',
          tone: 'error',
          title: t('skr.error.title'),
          onRetry: () => void refresh(),
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
        props: {
          testID: 'skr-empty',
          tone: 'empty',
          title: t('skr.empty.title'),
          body: t('skr.empty.body'),
        },
      },
    ];
  }
  return [
    {
      kind: 'facts',
      key: 'facts',
      props: { testID: 'skr-facts', title: t('skr.facts.title'), rows: summary },
    },
    {
      kind: 'label',
      key: 'price-title',
      props: { variant: 'title', children: t('skr.price.title') },
    },
    { kind: 'chart', key: 'price', props: chart },
    {
      kind: 'label',
      key: 'history-title',
      props: { variant: 'title', children: t('skr.history.title') },
    },
    history.length > 0
      ? { kind: 'facts', key: 'history', props: { testID: 'skr-history', rows: history } }
      : {
          kind: 'state',
          key: 'history',
          props: { testID: 'skr-history-empty', tone: 'empty', title: t('skr.history.empty') },
        },
  ];
}
