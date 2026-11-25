import { isLoggedIn, apiFetch, logout } from './api.js';
import { renderNav } from './nav.js';
import { buildAvatarFace, AVATAR_EYE_OPTIONS, AVATAR_MOUTH_OPTIONS } from './avatar.js';

if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

const avatarEl = document.getElementById('profileAvatar');
const usernameEl = document.getElementById('profileUsername');
const currentPointsEl = document.getElementById('profileCurrentPoints');
const totalTimeEl = document.getElementById('profileTotalTime');
const totalPointsEl = document.getElementById('profileTotalPoints');
const sessionListEl = document.getElementById('sessionList');
const logoutBtn = document.getElementById('logoutBtn');

const avatarEditBtn = document.getElementById('avatarEditBtn');
const avatarEditor = document.getElementById('avatarEditor');
const avatarEditorPreview = document.getElementById('avatarEditorPreview');
const eyePresetRow = document.getElementById('eyePresetRow');
const mouthPresetRow = document.getElementById('mouthPresetRow');
const avatarCancelBtn = document.getElementById('avatarCancelBtn');
const avatarSaveBtn = document.getElementById('avatarSaveBtn');
const avatarFeedback = document.getElementById('avatarFeedback');

let currentUser = null;
let selectedEyes = 'round';
let selectedMouth = 'smile';

const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatDateTime = (timestamp) => {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const renderSessionItem = (session) => {
  const item = document.createElement('div');
  item.className = 'session-item';

  const top = document.createElement('div');
  top.className = 'session-item-top';

  const nameEl = document.createElement('span');
  nameEl.className = 'session-item-name';
  nameEl.textContent = session.sessionName || session.mode;

  const pointsEl = document.createElement('span');
  pointsEl.className = 'session-item-points';
  pointsEl.textContent = `+${session.pointsEarned} pts`;

  top.append(nameEl, pointsEl);

  const bottom = document.createElement('div');
  bottom.className = 'session-item-bottom';

  const dateEl = document.createElement('span');
  dateEl.textContent = formatDateTime(session.startedAt);

  const durationEl = document.createElement('span');
  durationEl.textContent = formatDuration(session.durationSeconds);

  bottom.append(dateEl, durationEl);

  item.append(top, bottom);

  return item;
};

const loadProfile = async () => {
  try {
    const [userData, sessionsData] = await Promise.all([apiFetch('/users/me'), apiFetch('/sessions')]);

    const user = userData.user;
    currentUser = user;
    usernameEl.textContent = user.username;
    currentPointsEl.textContent = user.totalPoints;
    avatarEl.innerHTML = buildAvatarFace(user.avatarEyes, user.avatarMouth);

    const focusSessions = sessionsData.sessions.filter((s) => s.sessionType === 'focus');

    const totalSeconds = focusSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
    const totalPointsEarned = focusSessions.reduce((sum, s) => sum + s.pointsEarned, 0);

    totalTimeEl.textContent = focusSessions.length > 0 ? formatDuration(totalSeconds) : '0m';
    totalPointsEl.textContent = totalPointsEarned;

    sessionListEl.innerHTML = '';
    if (focusSessions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'session-empty';
      empty.textContent = 'No study sessions yet.';
      sessionListEl.appendChild(empty);
    } else {
      focusSessions.forEach((session) => sessionListEl.appendChild(renderSessionItem(session)));
    }
  } catch (error) {
    usernameEl.textContent = 'Could not load profile';
  }
};

const renderAvatarEditorPreview = () => {
  avatarEditorPreview.innerHTML = buildAvatarFace(selectedEyes, selectedMouth);
};

const renderPresetRow = (rowEl, options, selectedValue, onSelect) => {
  rowEl.innerHTML = '';

  options.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-preset-btn ${option === selectedValue ? 'is-selected' : ''}`;
    btn.setAttribute('aria-label', option);
    btn.innerHTML =
      rowEl === eyePresetRow ? buildAvatarFace(option, selectedMouth) : buildAvatarFace(selectedEyes, option);
    btn.addEventListener('click', () => onSelect(option));
    rowEl.appendChild(btn);
  });
};

const renderAvatarEditor = () => {
  renderPresetRow(eyePresetRow, AVATAR_EYE_OPTIONS, selectedEyes, (option) => {
    selectedEyes = option;
    renderAvatarEditor();
  });
  renderPresetRow(mouthPresetRow, AVATAR_MOUTH_OPTIONS, selectedMouth, (option) => {
    selectedMouth = option;
    renderAvatarEditor();
  });
  renderAvatarEditorPreview();
};

avatarEditBtn.addEventListener('click', () => {
  selectedEyes = currentUser?.avatarEyes || 'round';
  selectedMouth = currentUser?.avatarMouth || 'smile';
  avatarFeedback.textContent = '';
  avatarEditor.hidden = false;
  renderAvatarEditor();
});

avatarCancelBtn.addEventListener('click', () => {
  avatarEditor.hidden = true;
});

avatarSaveBtn.addEventListener('click', async () => {
  avatarSaveBtn.disabled = true;
  avatarFeedback.textContent = '';

  try {
    const data = await apiFetch('/users/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEyes: selectedEyes, avatarMouth: selectedMouth }),
    });

    currentUser = { ...currentUser, avatarEyes: data.avatarEyes, avatarMouth: data.avatarMouth };
    avatarEl.innerHTML = buildAvatarFace(data.avatarEyes, data.avatarMouth);
    avatarFeedback.textContent = 'Saved!';

    setTimeout(() => {
      avatarEditor.hidden = true;
    }, 700);
  } catch (error) {
    avatarFeedback.textContent = `Could not save: ${error.message}`;
  } finally {
    avatarSaveBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await logout();
  window.location.href = 'index.html';
});

renderNav();
loadProfile();