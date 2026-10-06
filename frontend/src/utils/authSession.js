const TOKEN_KEY = 'cbrt_token';

// Authentication is intentionally scoped to the current browser tab so that
// different roles can be used side-by-side during operations and demos.
export const getAccessToken = () => sessionStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  // Remove tokens created by older builds, where all tabs shared one login.
  localStorage.removeItem(TOKEN_KEY);
};

export const removeAccessToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

