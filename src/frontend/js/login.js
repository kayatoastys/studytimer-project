import { apiFetch, setSession, isLoggedIn } from './api.js';

if (isLoggedIn()) {
  window.location.href = 'index.html';
}

const form = document.getElementById('loginForm');
const messageEl = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');

const showMessage = (text, type) => {
  messageEl.textContent = text;
  messageEl.className = `form-message ${type}`;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('', '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showMessage('Enter your username and password.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setSession(data.accessToken, data.user);
    showMessage('Welcome back! Redirecting…', 'success');
    window.location.href = 'index.html';
  } catch (error) {
    showMessage(error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});