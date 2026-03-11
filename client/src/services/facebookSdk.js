const FB_APP_ID = import.meta.env.VITE_FB_APP_ID;

export const initFacebookSdk = () =>
  new Promise((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      resolve();
    };

    if (document.getElementById('facebook-jssdk')) return resolve();

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });

export const login = (scope = 'ads_management,ads_read,business_management') =>
  new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response.authResponse) resolve(response.authResponse);
        else reject(new Error('Facebook login was cancelled or failed'));
      },
      { scope }
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
