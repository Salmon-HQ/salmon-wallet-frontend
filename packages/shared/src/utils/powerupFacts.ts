/**
 * The Powerups detail's facts card, as rows — the same two facts on both
 * twins, derived once here rather than spelled out in each catalogue
 * (`docs/POWERUPS-UI.md` §1.2).
 *
 * Core, not `powerups/**`: the catalogue is Home's surface and must survive a
 * build with Powerups off.
 */
import { getNetworkName } from './network';
import type { FactsCardRow, PowerupsCatalogEntryDetails } from '../types/ui/index';

/** Made by, and where it acts. Copy arrives translated; ids are formatted here. */
export function powerupFactRows(
  details: PowerupsCatalogEntryDetails,
  t: (key: string) => string
): FactsCardRow[] {
  return [
    {
      key: 'author',
      testID: 'powerups-detail-author',
      label: t('powerups.detail.made_by'),
      value: t(details.authorKey),
    },
    {
      key: 'networks',
      label: t('powerups.detail.networks'),
      value: details.networks.map(getNetworkName).join(', '),
    },
  ];
}
