import { apiFetch } from './api.js';
import { renderNav } from './nav.js';
import { buildAvatarFace } from './avatar.js';

const listEl = document.getElementById('leaderboardList');

const renderRow = (entry, rank) => {
  const row = document.createElement('div');
  row.className = 'leaderboard-row';

  const rankEl = document.createElement('span');
  rankEl.className = 'leaderboard-rank';
  rankEl.textContent = rank;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'leaderboard-avatar';
  avatarEl.innerHTML = buildAvatarFace(entry.avatarEyes, entry.avatarMouth); // safe: built from fixed preset values only

  const usernameEl = document.createElement('span');
  usernameEl.className = 'leaderboard-username';
  usernameEl.textContent = entry.username; // the actual fix: rendered as text, never parsed as HTML

  const pointsEl = document.createElement('span');
  pointsEl.className = 'leaderboard-points';
  pointsEl.textContent = `${entry.accumulatedPoints} pts`;

  row.append(rankEl, avatarEl, usernameEl, pointsEl);
  return row;
};

const loadLeaderboard = async () => {
  try {
    const data = await apiFetch('/users/leaderboard?limit=20');

    listEl.innerHTML = '';

    if (data.leaderboard.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'No one has studied yet — be the first!';
      listEl.appendChild(empty);
      return;
    }

    data.leaderboard.forEach((entry, index) => {
      listEl.appendChild(renderRow(entry, index + 1));
    });
  } catch (error) {
    listEl.innerHTML = '<p class="leaderboard-empty">Could not load the leaderboard right now.</p>';
  }
};

renderNav();
loadLeaderboard();