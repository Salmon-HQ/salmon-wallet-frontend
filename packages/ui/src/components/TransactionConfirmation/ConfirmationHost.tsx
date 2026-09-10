/**
 * ConfirmationHost — where a Powerup's proposal becomes a signature, on the
 * DOM. Mounted once above the whole app. While core holds a signature request
 * it covers the viewport — the DOM's own window over whatever screen
 * proposed — renders `TransactionConfirmation` from the proposal, and on
 * confirm shows the wave wait while core signs, broadcasts and confirms. The
 * wait leaves on its own last wave; only then does the cover go.
 *
 * The mobile twin is `apps/mobile/src/components/TransactionConfirmation/ConfirmationHost.tsx`.
 */
import React, { useEffect, useState } from 'react';
import { useSignatureRequestHost, useWaitExit } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useTaskChromeClaim } from '../../contexts/TaskChromeContext';
import { DepthBackground } from '../DepthBackground';
import { LoadingScreen } from '../LoadingScreen';
import { ScalesBackground } from '../ScalesBackground';
import { TransactionConfirmation } from './TransactionConfirmation';

export function ConfirmationHost() {
  const semantic = useSemantic();
  const { request, refreshing, confirmLabel, confirmOrRefresh, cancel } =
    useSignatureRequestHost();

  const isOpen = request !== null;
  const isSigning = request?.phase === 'signing';

  // The wait between the decision and the receipt: held past its own exit so
  // the cover only goes once the last wave has left (DESIGN.md §The wait).
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(!!isSigning);
  const [waveCopy, setWaveCopy] = useState({ title: '', subtitle: '' });
  useEffect(() => {
    if (request?.phase === 'signing') {
      setWaveCopy({
        title: request.proposal.display.pendingTitle,
        subtitle: request.proposal.display.pendingSubtitle ?? '',
      });
    }
  }, [request]);

  const isVisible = isOpen || isWaveHeld;

  // The shell's chrome leaves while the cover is up and returns as it goes.
  const engageTaskChrome = useTaskChromeClaim();
  useEffect(() => {
    engageTaskChrome(isVisible);
  }, [isVisible, engageTaskChrome]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="confirmation-window"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: semantic.depth.column,
      }}
    >
      <DepthBackground style={{ zIndex: 0 }} />
      <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {request && !isSigning && (
          <TransactionConfirmation
            display={request.proposal.display}
            onBack={cancel}
            onConfirm={() => void confirmOrRefresh()}
            confirmLabel={confirmLabel}
            isRefreshing={refreshing}
            error={request.error}
          />
        )}

        {isWaveHeld && (
          <LoadingScreen
            visible={!!isSigning}
            waves
            title={waveCopy.title}
            subtitle={waveCopy.subtitle}
            onExited={onWaveGone}
          />
        )}
      </div>
    </div>
  );
}
