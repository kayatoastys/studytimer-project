import { isLoggedIn, getUser, updateStoredUser, apiFetch } from './api.js';

export const renderNav = async () => {
  const headerPointsEl = document.getElementById('headerPoints');
  const profileLinkEl = document.getElementById('profileLink');

  if (!isLoggedIn()) {
    if (headerPointsEl) {
      headerPointsEl.href = 'login.html';
      headerPointsEl.textContent = 'Log in to earn points';
      headerPointsEl.classList.remove('is-idle');
      headerPointsEl.removeAttribute('tabindex');
    }
    if (profileLinkEl) {
      profileLinkEl.href = 'login.html';
      profileLinkEl.textContent = 'Log in';
    }
    return;
  }

  if (headerPointsEl) {
    headerPointsEl.removeAttribute('href');
    headerPointsEl.classList.add('is-idle');
    headerPointsEl.setAttribute('tabindex', '-1');
  }
  if (profileLinkEl) {
    profileLinkEl.href = 'profile.html';
    profileLinkEl.textContent = 'Profile';
  }

  const applyPoints = (user) => {
    if (headerPointsEl) headerPointsEl.textContent = `${user.totalPoints} pts`;
  };

  applyPoints(getUser());

  try {
    const data = await apiFetch('/users/me');
    updateStoredUser(data.user);
    applyPoints(data.user);
  } catch (error) {
    // Cached data is already shown; a failed refresh isn't worth surfacing.
  }
};