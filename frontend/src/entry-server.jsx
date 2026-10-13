// ─── Server-side browser API polyfills ───────────────────────────────────────
if (typeof globalThis.localStorage === 'undefined') {
  const noopStorage = {
    _data: {},
    getItem(key) { return this._data[key] ?? null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; },
    key(i) { return Object.keys(this._data)[i] ?? null; },
    get length() { return Object.keys(this._data).length; },
  };
  globalThis.localStorage = noopStorage;
  globalThis.sessionStorage = { ...noopStorage, _data: {} };
}
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node' };
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

// Suppress useLayoutEffect warning on server side during SSR
if (typeof console !== 'undefined' && console.error) {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) {
      return;
    }
    originalError(...args);
  };
}

import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { SsrDataProvider } from './ssr/SsrDataContext';

export function render(url, ssrData = null) {
  const html = renderToString(
    <React.StrictMode>
      <SsrDataProvider initialData={ssrData}>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
      </SsrDataProvider>
    </React.StrictMode>
  );
  
  return { html };
}
