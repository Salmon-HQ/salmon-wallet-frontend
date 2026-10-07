import {
  initializeMobileWalletAdapterSession,
  initializeMWAEventListener,
  MWARequestFailReason,
  MWASessionEventType,
  resolve,
  type MWARequest,
} from '@solana-mobile/mobile-wallet-adapter-walletlib';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';

// ponytail: spike stub — declines every request; replaced by the approval host (spec 036 T013).
export function MwaRoot() {
  useEffect(() => {
    const listener = initializeMWAEventListener(
      (request: MWARequest) => {
        resolve(request as never, { failReason: MWARequestFailReason.UserDeclined } as never);
      },
      (event) => {
        if (event.__type === MWASessionEventType.SessionTerminatedEvent) BackHandler.exitApp();
      }
    );
    initializeMobileWalletAdapterSession('Salmon', {
      maxTransactionsPerSigningRequest: 10,
      maxMessagesPerSigningRequest: 10,
      supportedTransactionVersions: [0, 'legacy'],
      noConnectionWarningTimeoutMs: 3000,
      optionalFeatures: [],
    }).catch((error: unknown) => console.warn('[mwa] session failed', error));
    return () => listener.remove();
  }, []);

  return <View style={{ flex: 1 }} />;
}
