import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SsrDataProvider } from './ssr/SsrDataContext';
import './index.css';

const rootElement = document.getElementById('root');

// Read initial SSR data from window if present
const initialSsrData = window.__SSR_DATA__ || null;

const app = (
  <React.StrictMode>
    <SsrDataProvider initialData={initialSsrData}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SsrDataProvider>
  </React.StrictMode>
);

if (import.meta.env.SSR || window.__SSR_DATA__) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
