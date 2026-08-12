import '../../polyfills/node';

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/fonts.css';

// Initialize i18n configuration - must be imported before App
import i18n from '../../i18n/config';
import { I18nextProvider } from 'react-i18next';

// Initialize storage and stash for extension platform
import {
  APP_VERSION,
  initStorage,
  initStash,
  initAnalytics,
  AccountsProvider,
  CurrencyProvider,
  createQueryClient,
  QueryClientProvider,
  BridgeSettlementProvider,
} from '@salmon/shared';

initStorage({ platform: 'extension' });
initStash('extension');
// Anonymous, opt-in usage analytics (no events until the user opts in).
initAnalytics({ platform: 'extension', appVersion: APP_VERSION });

// Wait for the viewport to have dimensions before importing App.
// The side panel may not be sized yet at script execution time, and
// styled components evaluate scaling functions (s, vs, ms) at definition
// time — so we need real window dimensions before those modules load.
const waitForLayout = (): Promise<void> =>
  new Promise((resolve) => {
    if (window.innerWidth > 0 && window.innerHeight > 0) {
      resolve();
      return;
    }

    const check = () => {
      if (window.innerWidth > 0 && window.innerHeight > 0) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  });

(async () => {
  await waitForLayout();

  // Dynamic import so styled components see real viewport dimensions
  const { default: App } = await import('../popup/App');

  function Root() {
    const [queryClient] = React.useState(() => createQueryClient());
    return (
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BridgeSettlementProvider>
            <I18nextProvider i18n={i18n}>
              <AccountsProvider>
                <CurrencyProvider>
                  <App />
                </CurrencyProvider>
              </AccountsProvider>
            </I18nextProvider>
          </BridgeSettlementProvider>
        </QueryClientProvider>
      </React.StrictMode>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);

  // ----------------------------
  // CONNECT SIDE PANEL TO BACKGROUND
  // ----------------------------

  const port = chrome.runtime.connect({ name: 'salmon_sidepanel' });

  // Receive messages from background
  port.onMessage.addListener((msg) => {
    if (import.meta.env.DEV) {
      console.log('Message from background:', msg);
    }

    if (msg.type === 'CONNECT_REQUEST') {
      // acá podés disparar la UI de aprobación
      window.dispatchEvent(new CustomEvent('salmon_connect_request', { detail: msg.data }));
    }
  });

  port.onDisconnect.addListener(() => {
    console.warn('Sidepanel disconnected from background');
  });
})();
