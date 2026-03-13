const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

// Track whether FB.init() has been called in this session
let fbInitialized = false;

export const initFacebookSdk = () =>
  new Promise((resolve) => {
    // Already initialized — safe to proceed
    if (fbInitialized) return resolve();

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v25.0'
      });
      fbInitialized = true;
      resolve();
    };

    if (document.getElementById('facebook-jssdk')) {
      // Script already in DOM — wait for fbAsyncInit to fire (not just window.FB to exist)
      // window.FB can exist before fbAsyncInit fires, so we wait for fbInitialized
      const waitForInit = (attempt = 0) => {
        if (fbInitialized) return;          // fbAsyncInit fired, already resolved
        if (attempt > 40) return resolve(); // give up after ~4s
        setTimeout(() => waitForInit(attempt + 1), 100);
      };
      return waitForInit();
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
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
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
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
