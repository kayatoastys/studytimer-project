import { isLoggedIn, apiFetch } from './api.js';
import { renderNav } from './nav.js';

const messageEl = document.getElementById('shopMessage');
const crateGridEl = document.getElementById('crateGrid');
const characterGridEl = document.getElementById('characterGrid');
const backgroundGridEl = document.getElementById('backgroundGrid');

const CHANCES_TEXT = 'Common 45% · Uncommon 25% · Rare 15% · Epic 10% · Legendary 5%';

const showMessage = (text, type) => {
  messageEl.textContent = text;
  messageEl.className = `shop-message ${type}`;
};

const GIFT_ICON = `
  <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6">
    <rect x="3" y="9" width="18" height="12" rx="1"></rect>
    <path d="M3 9 L21 9 M12 9 L12 21"></path>
    <path d="M12 9 C 9 9 8 6 9.5 4.5 C 11 3 12 6 12 9 C 12 6 13 3 14.5 4.5 C 16 6 15 9 12 9 Z"></path>
  </svg>
`;

const renderCrateCard = (crate) => {
  const card = document.createElement('div');
  card.className = 'crate-card';
  card.innerHTML = `
    <div class="crate-image">${GIFT_ICON}</div>
    <div class="crate-info">
      <span class="crate-price">${crate.price} pts</span>
      <p class="crate-description">${crate.description || ''}</p>
      <p class="crate-chances">Chances: ${CHANCES_TEXT}</p>
      <p class="crate-name">${crate.name}</p>
      <button type="button" class="crate-open-btn" data-crate-id="${crate.crateId}">Open crate</button>
    </div>
  `;

  card.querySelector('.crate-open-btn').addEventListener('click', () => openCrate(crate.crateId, card));

  return card;
};

const openCrate = async (crateId, card) => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const btn = card.querySelector('.crate-open-btn');
  btn.disabled = true;
  btn.textContent = 'Opening…';

  try {
    const data = await apiFetch(`/crates/${crateId}/open`, { method: 'POST' });
    showMessage(`You got: ${data.wonItem.name} (${data.wonItem.rarity})! Now at ${data.totalPoints} pts.`, 'success');
    renderNav();
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Open crate';
  }
};

const renderItemCard = (item) => {
  const card = document.createElement('div');
  card.className = 'item-card';
  const noMediaBadge = item.imageUrl ? '' : '<span class="no-media-badge">No media yet</span>';
  card.innerHTML = `
    <div class="item-image rarity-${item.rarity}">${item.name.charAt(0)}</div>
    <p class="item-name">${item.name} ${noMediaBadge}</p>
    <p class="item-price">${item.price} pts</p>
    <button type="button" class="item-buy-btn" data-item-id="${item.itemId}">Buy</button>
  `;

  card.querySelector('.item-buy-btn').addEventListener('click', () => purchaseItem(item.itemId, card));

  return card;
};

const purchaseItem = async (itemId, card) => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const btn = card.querySelector('.item-buy-btn');
  btn.disabled = true;
  btn.textContent = 'Buying…';

  try {
    const data = await apiFetch(`/items/${itemId}/purchase`, { method: 'POST' });
    showMessage(`Bought ${data.item.name} for ${data.item.price} pts. Now at ${data.totalPoints} pts.`, 'success');
    renderNav();
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buy';
  }
};

const loadCrates = async () => {
  const data = await apiFetch('/crates');
  data.crates.forEach((crate) => crateGridEl.appendChild(renderCrateCard(crate)));
};

const loadItems = async (type, gridEl) => {
  const data = await apiFetch(`/items?type=${type}&purchasable=true`);
  data.items.forEach((item) => gridEl.appendChild(renderItemCard(item)));
};

renderNav();
loadCrates();
loadItems('character', characterGridEl);
loadItems('background', backgroundGridEl);