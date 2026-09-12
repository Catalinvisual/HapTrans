import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';
import './lib/i18n';

// Some browser extensions (React DevTools, translation/grammar helpers, etc.)
// answer Chrome messages with "return true" but their message port can be
// closed by the time a reply is sent. Those rejections are harmless and land
// in the DevTools console as noisy unhandled promises. Swallow only the exact
// known-benign patterns; every other rejection still surfaces.
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason && e.reason?.message ? String(e.reason.message) : String(e.reason || '');
  if (/listener indicated an asynchronous response by returning true|message channel closed before a response was received|message port closed before a response was received/.test(msg)) {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
