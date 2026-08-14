import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Global fetch interceptor to support subpaths (like /todo)
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
