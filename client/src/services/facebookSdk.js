// ── Facebook SDK — Global Promise Initialization Guard ────────────────────────
//
// Pattern:
//   window.fbPromise is a single global Promise that resolves ONLY after
//   fbAsyncInit fires and FB.init() completes. Every SDK call (login, logout,
//   getLoginStatus) awaits this promise before touching window.FB.
//

const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

// ── 1. Create the global initialization promise ──────────────────────────────
window.fbPromise = new Promise((resolve, reject) => {
  // Case A: SDK already fully loaded (HMR, re-import, etc.)
  if (window.FB?.getLoginStatus) {
    window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
    return resolve();
  }

  // Case B: SDK not yet loaded — wait for fbAsyncInit
  window.fbAsyncInit = () => {
    window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
    resolve();
  };

  // Case C: Timeout — reject after 10s so the UI doesn't spin forever
  setTimeout(() => {
    reject(new Error('Facebook SDK failed to load. Please check your connection and refresh.'));
  }, 10000);

  // Inject the script tag if not already present
  if (!document.getElementById('facebook-jssdk')) {
    const script  = document.createElement('script');
    script.id     = 'facebook-jssdk';
    script.src    = 'https://connect.facebook.net/en_US/sdk.js';
    script.async  = true;
    script.onerror = () =>
      reject(new Error('Failed to load Facebook SDK script.'));
    document.body.appendChild(script);
  }
});

// ── 2. Login — awaits the guard, then calls FB.login() ───────────────────────
export const login = async () => {
  await window.fbPromise;                       // ← Initialization Guard
  return new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject(new Error(`Facebook login failed (status: ${response.status})`));
        }
      },
      { config_id: FB_CONFIG_ID, response_type: 'token' }
    );
  });
};

// ── 3. Helpers — all guarded by the same promise ─────────────────────────────
export const getLoginStatus = async () => {
  await window.fbPromise;
  return new Promise((resolve) => {
    window.FB.getLoginStatus((response) => resolve(response));
  });
};

export const logout = async () => {
  await window.fbPromise;
  return new Promise((resolve) => {
    window.FB.logout(() => resolve());
  });
};

// Re-export the guard so React components can track readiness
export const fbPromise = window.fbPromise;
