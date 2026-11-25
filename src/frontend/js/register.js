import { apiFetch, setSession, isLoggedIn } from './api.js';

if (isLoggedIn()) {
  window.location.href = 'index.html';
}

const form = document.getElementById('registerForm');
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
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (username.length < 3) {
    showMessage('Username must be at least 3 characters.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters.', 'error');
    return;
  }
  if (password !== confirmPassword) {
    showMessage('Passwords do not match.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setSession(data.accessToken, data.user);
    showMessage('Account created! Redirecting…', 'success');
    window.location.href = 'index.html';
  } catch (error) {
    showMessage(error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});