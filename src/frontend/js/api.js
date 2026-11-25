// Shared across every page: talks to the backend and manages the access
// token stored in localStorage. Import with: import { apiFetch, getUser, ... } from './api.js'
//
// Token design: the ACCESS token (short-lived, 15 min) lives here in
// localStorage. The REFRESH token (long-lived, 7 days) is never touched by
// this file at all — it lives only in an httpOnly cookie the browser sends
// automatically to /api/auth/refresh and /api/auth/logout, and this file
// has no way to read it even if it wanted to. That split is deliberate:
// if an access token is ever stolen (e.g. via XSS), the attacker only gets
// a 15-minute window, not indefinite access.

const TOKEN_KEY = 'studyTimerToken';
const USER_KEY = 'studyTimerUser';

/** @returns {string|null} The stored access token, or null if not logged in. */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** @returns {object|null} The stored user object, or null if not logged in. */
export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

/** @returns {boolean} Whether a session is currently stored. */
export const isLoggedIn = () => Boolean(getToken());

/**
 * Store the session after a successful register/login.
 * @param {string} accessToken
 * @param {object} user
 */
export const setSession = (accessToken, user) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/** Clears the locally stored session only — does NOT revoke the refresh
 * token server-side. Prefer logout() below for an actual sign-out. */
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Overwrite the cached user object without touching the token — used after
 * fetching fresh data (e.g. GET /users/me) so getUser() stays up to date.
 * @param {object} user
 */
export const updateStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Calls the refresh token cookie to silently obtain a new access token,
 * without the user needing to log in again. Returns the new token on
 * success, or null if the refresh token is missing/expired/invalid — in
 * which case the caller should treat the user as logged out.
 *
 * Deduplicated: if several apiFetch calls 401 around the same moment (e.g.
 * profile.js's Promise.all firing two requests together right as the access
 * token expires), they all share this ONE in-flight refresh instead of each
 * independently hitting /api/auth/refresh. Without this, the second request
 * to reach the server would find the refresh token already rotated by the
 * first and get wrongly logged out — a real race, not a hypothetical one,
 * given how often this app fires concurrent requests on page load.
 * @returns {Promise<string|null>}
 */
let refreshInFlight = null;

const tryRefreshAccessToken = async () => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // sends the httpOnly refresh cookie
      });

      if (!response.ok) return null;

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      return data.accessToken;
    } catch (error) {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

/**
 * Logs out properly: tells the backend to revoke the refresh token
 * (deletes it server-side, so it can't be used again even if someone had
 * copied it) and clears the cookie, then clears the local session.
 * Best-effort — if the network call fails, the local session is cleared
 * regardless so the user isn't stuck "logged in" on their own device.
 */
export const logout = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    // Ignore — still clear the local session below either way.
  }
  clearSession();
};

/**
 * Fetch wrapper for the API. Automatically attaches the access token if
 * logged in, parses JSON, and throws a plain Error with the backend's
 * message on any non-2xx response, so callers can just try/catch and show
 * err.message.
 *
 * On a 401 (expired/invalid access token), automatically attempts a silent
 * refresh via the httpOnly cookie and retries the request ONCE with the new
 * token — the user never notices their 15-minute access token expired mid-
 * session. If the refresh itself fails, the local session is cleared so the
 * app correctly treats the user as logged out.
 *
 * @param {string} path - e.g. '/auth/login' (the '/api' prefix is added here)
 * @param {RequestInit} [options]
 * @returns {Promise<object>} Parsed JSON body.
 */
export const apiFetch = async (path, options = {}) => {
  const isAuthEndpoint = path.startsWith('/auth/');

  const doFetch = async () => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  };

  let response = await doFetch();

  if (response.status === 401 && !isAuthEndpoint) {
    const newToken = await tryRefreshAccessToken();

    if (newToken) {
      response = await doFetch(); // retry once with the fresh token
    } else {
      clearSession();
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || 'Something went wrong. Please try again.';
    throw new Error(message);
  }

  return data;
};