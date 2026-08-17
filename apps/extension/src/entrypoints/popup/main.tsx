import '../../polyfills/node';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../assets/fonts.css';

// Theme — MUI needs an explicit dark theme; its default is light.
import { CssBaseline, ThemeProvider } from '@mui/material';
import { salmonTheme } from '@salmon/ui';

// Initialize i18n configuration - must be imported before App
import i18n from '../../i18n/config';
import { I18nextProvider } from 'react-i18next';
import { PendingActivityLayer } from '../../components/PendingActivityLayer';

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

// Initialize storage with Chrome extension adapter
initStorage({ platform: 'extension' });

// Initialize stash for session data (communicates with background worker)
initStash('extension');

// Anonymous, opt-in usage analytics (no events until the user opts in).
initAnalytics({ platform: 'extension', appVersion: APP_VERSION });

function Root() {
  const [queryClient] = React.useState(() => createQueryClient());
  return (
    <React.StrictMode>
      <ThemeProvider theme={salmonTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BridgeSettlementProvider>
            <I18nextProvider i18n={i18n}>
              <AccountsProvider>
                <CurrencyProvider>
                  <PendingActivityLayer>
                    <App />
                  </PendingActivityLayer>
                </CurrencyProvider>
              </AccountsProvider>
            </I18nextProvider>
          </BridgeSettlementProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
