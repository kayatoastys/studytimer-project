import { isLoggedIn, apiFetch } from './api.js';
import { renderNav } from './nav.js';

const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59; // 99:59:59 cap

const timerTabsEl = document.getElementById('timerTabs');
const timerDisplayEl = document.getElementById('timerDisplay');
const timerHintEl = document.getElementById('timerHint');
const sessionNameInputEl = document.getElementById('timerSessionName');
const timerButtonsEl = document.getElementById('timerButtons');
const timerFeedbackEl = document.getElementById('timerFeedback');
const characterFigureEl = document.getElementById('characterFigure');

let currentMode = 'timer';
let runState = 'stopped';
let intervalId = null;
let displaySeconds = 0;
let timerConfiguredSeconds = 0;
let rawDigitBuffer = '';

const formatHHMMSS = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const bufferToSeconds = (buffer) => {
  const padded = buffer.padStart(6, '0');
  const hh = parseInt(padded.slice(0, 2), 10);
  const mm = parseInt(padded.slice(2, 4), 10);
  const ss = parseInt(padded.slice(4, 6), 10);
  const total = hh * 3600 + mm * 60 + ss;
  return Math.min(total, MAX_SECONDS);
};

const renderClock = (seconds) => {
  timerDisplayEl.textContent = formatHHMMSS(seconds);
};

const renderButtons = () => {
  timerButtonsEl.innerHTML = '';

  if (runState === 'stopped') {
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'timer-btn timer-btn--primary';
    startBtn.textContent = 'Start';
    startBtn.disabled = currentMode === 'timer' && timerConfiguredSeconds === 0;
    startBtn.addEventListener('click', handleStart);
    timerButtonsEl.appendChild(startBtn);
  } else if (runState === 'running') {
    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'timer-btn timer-btn--stop';
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', handlePause);
    timerButtonsEl.appendChild(stopBtn);
  } else if (runState === 'paused') {
    const endBtn = document.createElement('button');
    endBtn.type = 'button';
    endBtn.className = 'timer-btn timer-btn--end';
    endBtn.textContent = 'End';
    endBtn.addEventListener('click', handleEnd);

    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.className = 'timer-btn timer-btn--resume';
    resumeBtn.textContent = 'Resume';
    resumeBtn.addEventListener('click', handleResume);

    timerButtonsEl.append(endBtn, resumeBtn);
  }
};

const isEditable = () => runState === 'stopped' && currentMode === 'timer';

const renderLockState = () => {
  const locked = runState !== 'stopped';

  timerTabsEl.classList.toggle('is-disabled', locked);
  sessionNameInputEl.disabled = locked;
  timerDisplayEl.classList.toggle('is-locked', !isEditable());

  if (isEditable()) {
    timerDisplayEl.setAttribute('tabindex', '0');
    timerHintEl.textContent = 'Click the clock, then type to set a duration';
    timerHintEl.style.visibility = 'visible';
  } else {
    timerDisplayEl.removeAttribute('tabindex');
    timerHintEl.style.visibility = 'hidden';
  }
};

const showFeedback = (text) => {
  timerFeedbackEl.textContent = text;
};

const switchMode = (mode) => {
  if (runState !== 'stopped') return;

  currentMode = mode;
  rawDigitBuffer = '';

  [...timerTabsEl.children].forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.mode === mode);
  });

  displaySeconds = mode === 'stopwatch' ? 0 : timerConfiguredSeconds;

  renderClock(displaySeconds);
  renderLockState();
  renderButtons();
};

const renderRawBuffer = () => {
  const padded = rawDigitBuffer.padStart(6, '0');
  timerDisplayEl.textContent = `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
};

const finalizeDuration = () => {
  if (rawDigitBuffer === '') return;

  const seconds = bufferToSeconds(rawDigitBuffer);
  displaySeconds = seconds;
  timerConfiguredSeconds = seconds;
  rawDigitBuffer = '';

  renderClock(seconds);
  renderButtons();
};

timerDisplayEl.addEventListener('keydown', (event) => {
  if (!isEditable()) return;

  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault();
    if (rawDigitBuffer.length < 6) {
      rawDigitBuffer += event.key;
      if (rawDigitBuffer.length === 6) {
        finalizeDuration();
      } else {
        renderRawBuffer();
      }
    }
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    rawDigitBuffer = rawDigitBuffer.slice(0, -1);
    if (rawDigitBuffer === '') {
      timerConfiguredSeconds = 0;
      displaySeconds = 0;
      renderClock(0);
      renderButtons();
    } else {
      renderRawBuffer();
    }
  } else if (event.key !== 'Tab') {
    event.preventDefault();
  }
});

timerDisplayEl.addEventListener('click', () => {
  if (isEditable()) timerDisplayEl.focus();
});

timerDisplayEl.addEventListener('blur', () => {
  if (rawDigitBuffer.length > 0) {
    finalizeDuration();
  }
});

const startInterval = () => {
  intervalId = setInterval(tick, 1000);
};

const stopInterval = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const tick = () => {
  if (currentMode === 'stopwatch') {
    displaySeconds = Math.min(displaySeconds + 1, MAX_SECONDS);
    renderClock(displaySeconds);
    return;
  }

  displaySeconds -= 1;

  if (displaySeconds <= 0) {
    displaySeconds = 0;
    renderClock(0);
    completeTimerNaturally();
    return;
  }

  renderClock(displaySeconds);
};

const completeTimerNaturally = () => {
  stopInterval();
  const studiedSeconds = timerConfiguredSeconds;
  finishSession(studiedSeconds, 'Timer complete!');
};

const handleStart = () => {
  displaySeconds = currentMode === 'stopwatch' ? 0 : timerConfiguredSeconds;

  rawDigitBuffer = '';
  runState = 'running';
  showFeedback('');
  renderClock(displaySeconds);
  renderLockState();
  renderButtons();
  startInterval();
};

const handlePause = () => {
  stopInterval();
  runState = 'paused';
  renderButtons();
};

const handleResume = () => {
  runState = 'running';
  renderButtons();
  startInterval();
};

const handleEnd = async () => {
  stopInterval();

  const studiedSeconds = currentMode === 'stopwatch' ? displaySeconds : timerConfiguredSeconds - displaySeconds;

  if (studiedSeconds > 0) {
    await submitSession(studiedSeconds);
  }

  resetToStoppedUI();
};

const finishSession = async (studiedSeconds, feedbackPrefix) => {
  if (studiedSeconds > 0) {
    await submitSession(studiedSeconds, feedbackPrefix);
  }
  resetToStoppedUI();
};

const submitSession = async (studiedSeconds, feedbackPrefix) => {
  if (!isLoggedIn()) {
    showFeedback('Log in to save your progress — this session was not recorded.');
    return;
  }

  const sessionName = sessionNameInputEl.value.trim();

  try {
    const data = await apiFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        mode: currentMode,
        sessionType: 'focus',
        durationSeconds: studiedSeconds,
        sessionName: sessionName || undefined,
      }),
    });

    const prefix = feedbackPrefix ? `${feedbackPrefix} ` : '';
    showFeedback(`${prefix}+${data.session.pointsEarned} pts. Now at ${data.totalPoints} pts.`);
    renderNav();
  } catch (error) {
    showFeedback(`Could not save this session: ${error.message}`);
  }
};

const resetToStoppedUI = () => {
  runState = 'stopped';
  rawDigitBuffer = '';
  displaySeconds = currentMode === 'stopwatch' ? 0 : timerConfiguredSeconds;

  renderClock(displaySeconds);
  renderLockState();
  renderButtons();
};

[...timerTabsEl.children].forEach((tab) => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

const loadEquippedCompanion = async () => {
  if (!isLoggedIn()) return;

  try {
    const data = await apiFetch('/inventory/equipped');

    if (data.character?.imageUrl) {
      characterFigureEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.character.imageUrl;
      img.alt = data.character.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      characterFigureEl.appendChild(img);
    }

    if (data.background?.imageUrl) {
      // The equipped background now becomes the whole page's backdrop —
      // behind the header, nav, and timer panel — not just a small box.
      document.body.style.backgroundImage = `url(${data.background.imageUrl})`;
    }
  } catch (error) {
    // Equipped items just won't load this time; the placeholder figure/background stays.
  }
};

renderClock(displaySeconds);
renderLockState();
renderButtons();
renderNav();
loadEquippedCompanion();