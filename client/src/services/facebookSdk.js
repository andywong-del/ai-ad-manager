const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

let _sdkReady = false;
let _initPromise = null;

// Pre-load and initialize the SDK — call this early (e.g. on app mount)
export const initFacebookSdk = () => {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      _sdkReady = true;
      return resolve();
    }

    const timeout = setTimeout(() => {
      _initPromise = null;
      reject(new Error('Facebook SDK timed out. Please refresh and try again.'));
    }, 15000);

    window.fbAsyncInit = () => {
      clearTimeout(timeout);
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      _sdkReady = true;
      resolve();
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.onerror = () => {
        clearTimeout(timeout);
        _initPromise = null;
        reject(new Error('Failed to load Facebook SDK'));
      };
      document.body.appendChild(script);
    }
  });

  return _initPromise;
};

// Start loading immediately on import
initFacebookSdk().catch(() => {});

// Login — calls FB.login() as synchronously as possible from the click handler
export const login = () => {
  // If SDK is already ready, call FB.login() synchronously (no promise wrapping)
  // This keeps us in the user-click call stack so the browser allows the popup
  if (_sdkReady && window.FB) {
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
  }

  // SDK not ready yet — wait for it, then call FB.login()
  // Note: popup may be blocked if the SDK takes too long to load
  return new Promise((resolve, reject) => {
    initFacebookSdk()
      .then(() => {
        if (!window.FB) {
          return reject(new Error('Facebook SDK not loaded. Please refresh and try again.'));
        }
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
      })
      .catch(reject);
  });
};

export const getLoginStatus = () =>
  new Promise((resolve) => {
    if (window.FB) window.FB.getLoginStatus((response) => resolve(response));
    else resolve({ status: 'unknown' });
  });

export const logout = () =>
  new Promise((resolve) => {
    if (window.FB) window.FB.logout(() => resolve());
    else resolve();
  });
