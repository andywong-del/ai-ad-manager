import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { initFacebookSdk } from './services/facebookSdk.js';

const mount = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

// Initialize Facebook SDK before rendering — fall back gracefully if no app ID
initFacebookSdk().then(mount).catch(mount);
