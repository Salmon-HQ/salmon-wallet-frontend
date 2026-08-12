// Buffer polyfill — must be first
import { Buffer } from 'buffer';
(globalThis as Record<string, unknown>).Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';

// Fonts
import './assets/fonts.css';

// i18n — before App
import i18n from './i18n/config';
import { I18nextProvider } from 'react-i18next';

// Storage and stash
import {
  APP_VERSION,
  initStorage,
  initStash,
  initAnalytics,
  AccountsProvider,
  CurrencyProvider,
} from '@salmon/shared';

// App
import { App } from './App';
import { SalmonWalletRegistrar } from './providers/SalmonWalletProvider';

initStorage({ platform: 'web' });
initStash('web');
// Anonymous, opt-in usage analytics. No events are sent until the user opts in
// via Settings; this only wires the client and loads persisted consent.
initAnalytics({
  platform: 'web',
  appVersion: APP_VERSION,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AccountsProvider>
        <CurrencyProvider>
          <SalmonWalletRegistrar />
          <App />
        </CurrencyProvider>
      </AccountsProvider>
    </I18nextProvider>
  </React.StrictMode>
);
