/**
 * RequesterRow — who asks, on the DOM: the requester's icon (or the globe),
 * its name, and the domain the user can check. A Solana Pay merchant on the
 * review and on its sheet (spec 043). The mobile twin is
 * `apps/mobile/src/components/TransactionConfirmation/RequesterRow.tsx`.
 *
 * The icon is the merchant's, so it is drawn only over https, only as an
 * image (an SVG loaded this way runs nothing), with no referrer, and the
 * globe takes its place the moment it fails.
 */
import React, { useEffect, useState } from 'react';
import { borderRadius, requesterIconSource } from '@salmon/shared';

import { GlobeIcon } from '../../icons';
import { Hostname } from '../Hostname';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import type { RequesterRowProps } from './types';

export function RequesterRow({ name, icon, domain, testID }: RequesterRowProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [icon]);
  const src = failed ? null : requesterIconSource(icon);

  const leading = src ? (
    <IconBubble size={40} tone="surface">
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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
      title={name || domain}
      subtitle={<Hostname value={domain} testID="requester-domain" />}
      accessibilityLabel={name ? `${name}, ${domain}` : domain}
      tone="shelf"
      padding="md"
      testID={testID}
    />
  );
}
