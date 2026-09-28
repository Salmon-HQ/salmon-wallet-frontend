import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { IconDefaults, SalmonThemeProvider, TaskChromeProvider } from '@salmon/ui';
import {
  AccountsProvider,
  DeveloperModeProvider,
  CurrencyProvider,
  createQueryClient,
  QueryClientProvider,
} from '@salmon/shared';

import i18n from './i18n/config';
import { PendingActivityLayer } from './components/PendingActivityLayer';

/**
 * The provider tree every wallet surface mounts — the side panel and the popup
 * window. One tree, because two copies drifted: the popup lost the developer-
 * mode provider, and its Developer Networks toggle silently did nothing.
 */
export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  const [queryClient] = React.useState(() => createQueryClient());
  return (
    <React.StrictMode>
      <SalmonThemeProvider>
        <TaskChromeProvider>
          <IconDefaults>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                <AccountsProvider>
                  {/* The developer-mode flags belong to the unlocked session,
                      as on mobile's (app) stack: one provider above every
                      screen, and an older wallet's mirror addresses derived
                      the first time the flag asks (spec 026 D2). */}
                  <DeveloperModeProvider>
                    <CurrencyProvider>
                      <PendingActivityLayer>{children}</PendingActivityLayer>
                    </CurrencyProvider>
                  </DeveloperModeProvider>
                </AccountsProvider>
              </I18nextProvider>
            </QueryClientProvider>
          </IconDefaults>
        </TaskChromeProvider>
      </SalmonThemeProvider>
    </React.StrictMode>
  );
}
