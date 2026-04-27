import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { initFacebookSdk } from './services/facebookSdk.js';

// Wait for FB SDK to be fully initialized BEFORE mounting React.
// This guarantees FB.init() has completed by the time any component calls FB.login().
const mount = () =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );

initFacebookSdk().then(mount).catch(mount);
