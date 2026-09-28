import '../../polyfills/node';

import ReactDOM from 'react-dom/client';
import '../../assets/fonts.css';

// Initialize i18n configuration - must be imported before App
import '../../i18n/config';
import App from './App';
import { AppProviders } from '../../AppProviders';

// Initialize storage and stash for extension platform
import { APP_VERSION, initStorage, initStash, initAnalytics } from '@salmon/shared';

// Initialize storage with Chrome extension adapter
initStorage({ platform: 'extension' });

// Initialize stash for session data (communicates with background worker)
initStash('extension');

// Anonymous, opt-in usage analytics (no events until the user opts in).
initAnalytics({ platform: 'extension', appVersion: APP_VERSION });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
