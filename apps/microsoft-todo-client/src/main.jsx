import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './hooks/useTodoQueries.js';
import App from './App.jsx';
import './App.css';

// Global fetch interceptor to support subpaths (like /todo/)
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.startsWith('/api')) {
    let path = window.location.pathname;
    if (path.endsWith('.html')) {
      path = path.substring(0, path.lastIndexOf('/'));
    }
    if (!path.endsWith('/')) {
      path += '/';
    }
    url = path + url.substring(1); // prepend path (e.g. /todo/ + api/...)
  }
  return originalFetch(url, options);
};

// Calculate base name for React Router if running under /todo/
const getBasename = () => {
  const p = window.location.pathname;
  if (p.startsWith('/todo')) return '/todo';
  return '/';
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={getBasename()}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
