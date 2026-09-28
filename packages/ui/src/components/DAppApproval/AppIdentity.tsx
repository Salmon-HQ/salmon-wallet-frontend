import React from 'react';
import { borderRadius } from '@salmon/shared';

import { GlobeIcon } from '../../icons';
import { Hostname } from '../Hostname';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';

/**
 * Who is asking, as a `ListRow`: the site's favicon (or the globe) in the
 * leading bubble, its name as the title, its origin under it — or the origin
 * alone when the site sent no identity.
 */
export function AppIdentity({
  appName,
  appIcon,
  displayOrigin,
}: {
  appName?: string;
  appIcon?: string;
  displayOrigin: string;
}): React.ReactElement {
  const leading = appIcon ? (
    <IconBubble size={40} tone="surface">
      <img
        src={appIcon}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: borderRadius.full,
        }}
      />
    </IconBubble>
  ) : (
    <IconBubble size={40} tone="surface" icon={GlobeIcon} />
  );

  return (
    <ListRow
      leading={leading}
      title={appName || displayOrigin}
      // The origin is stated in full whether or not the site sent a name. When
      // it did not, the bold line repeats it — the row's title cannot wrap, and
      // the hostname losing its tail is the thing this screen must not do.
      subtitle={<Hostname value={displayOrigin} testID="dapp-origin" />}
      accessibilityLabel={appName ? `${appName}, ${displayOrigin}` : displayOrigin}
      tone="shelf"
      padding="md"
      testID="dapp-identity"
    />
  );
}
