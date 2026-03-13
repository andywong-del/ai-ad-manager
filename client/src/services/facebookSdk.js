const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

const initFB = () => {
  window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
};

export const initFacebookSdk = () =>
  new Promise((resolve) => {
    // If FB SDK already loaded, re-init and resolve immediately
    if (window.FB) {
      initFB();
      return resolve();
    }

    // Set fbAsyncInit for first-time load
    window.fbAsyncInit = function () {
      initFB();
      resolve();
    };

    // Only inject script if not already in DOM
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  });

export const login = () =>
  new Promise((resolve, reject) => {
    if (!window.FB) {
      return reject(new Error('Facebook SDK not loaded. Please refresh and try again.'));
    }

    const timeout = setTimeout(() => {
      reject(new Error('Facebook login timed out. Please try again.'));
    }, 30000);

    window.FB.login(
      (response) => {
        clearTimeout(timeout);
        console.log('[FB.login] full response:', JSON.stringify(response, null, 2));
        if (response.authResponse) {
          console.log('[FB.login] success — accessToken:', response.authResponse.accessToken);
          resolve(response.authResponse);
        } else {
          console.warn('[FB.login] failed/cancelled — status:', response.status);
          reject(new Error(`Facebook login failed (status: ${response.status})`));
        }
      },
      {
        config_id:     FB_CONFIG_ID,
        response_type: 'token',
      }
    );
  });

export const getLoginStatus = () =>
  new Promise((resolve) => {
    window.FB.getLoginStatus((response) => resolve(response));
  });

export const logout = () =>
  new Promise((resolve) => {
    window.FB.logout(() => resolve());
  });
