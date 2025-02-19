import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// יצירת קונפיגורציה ל-RTL
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CacheProvider value={cacheRtl}>
      <App />
    </CacheProvider>
  </React.StrictMode>
);

// רישום ה-Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    serviceWorkerRegistration.register({
      onSuccess: registration => {
        console.log('PWA registration successful');
      },
      onUpdate: registration => {
        console.log('New content is available; please refresh.');
        const waitingServiceWorker = registration.waiting;
        if (waitingServiceWorker) {
          waitingServiceWorker.addEventListener("statechange", event => {
            if (event.target.state === "activated") {
              window.location.reload();
            }
          });
          waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
        }
      }
    });
  });
}
