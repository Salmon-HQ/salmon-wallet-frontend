/**
 * The Activity list's two pure decisions live in `packages/shared`
 * (`utils/activityRows`) — the DOM page draws the same list. Re-exported here
 * so the route and its tests keep their import.
 */
export { ACTIVITY_FILTER_KEYS, GROUP_LABEL_KEYS, groupByDay, matchesFilter } from '@salmon/shared';
export type { ActivityFilter, ActivityGroup, ActivityRow } from '@salmon/shared';
