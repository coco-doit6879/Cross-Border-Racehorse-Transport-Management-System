const TOKEN_KEY = 'cbrt_token';
const USER_KEY = 'cbrt_user';

// Authentication is intentionally scoped to the current browser tab so that
// different roles can be used side-by-side during operations and demos.
export const getAccessToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAccessToken = (token) => {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage quota errors
  }
};

export const removeAccessToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore
  }
};

export const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  try {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Ignore
  }
};

