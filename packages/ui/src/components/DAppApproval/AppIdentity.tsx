import React from 'react';
import { borderRadius } from '@salmon/shared';

import { GlobeIcon } from '../../icons';
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
      subtitle={appName ? displayOrigin : undefined}
      tone="shelf"
      padding="md"
      testID="dapp-identity"
    />
  );
}
