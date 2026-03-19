// ── Facebook SDK — Global Promise Initialization Guard ────────────────────────
//
// Single source of truth: window.fbPromise
//   - Resolves ONLY after fbAsyncInit fires AND FB.init() completes
//   - Every SDK call (login, logout, getLoginStatus) awaits this promise
//   - Idempotent: safe to import multiple times (HMR, StrictMode, etc.)
//

const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

// ── 1. Create the global promise ONCE — skip if already set ──────────────────
if (!window.fbPromise) {
  window.fbPromise = new Promise((resolve, reject) => {
    // Already fully initialized (HMR hot-reload, etc.)
    if (window.FB?.getLoginStatus) {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      return resolve();
    }

    // fbAsyncInit is called BY the SDK once it's truly ready
    window.fbAsyncInit = () => {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      resolve();
    };

    // Timeout — reject after 10s so the UI doesn't spin forever
    setTimeout(() => {
      reject(new Error('Facebook SDK failed to load. Please check your connection and refresh.'));
    }, 10000);

    // Inject the script ONLY if not already in the DOM
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
}

// ── 2. Login — awaits the guard, then calls FB.login() ───────────────────────
export const login = async () => {
  await window.fbPromise;
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

// Re-export so React components can track readiness
export const fbPromise = window.fbPromise;
