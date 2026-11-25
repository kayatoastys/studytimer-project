import { isLoggedIn, apiFetch } from './api.js';
import { renderNav } from './nav.js';

if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

const characterGridEl = document.getElementById('characterGrid');
const backgroundGridEl = document.getElementById('backgroundGrid');

const renderInventoryCard = (item) => {
  const card = document.createElement('div');
  card.className = 'item-card';
  const noMediaBadge = item.imageUrl ? '' : '<span class="no-media-badge">No media yet</span>';
  card.innerHTML = `
    <div class="item-image rarity-${item.rarity}">${item.name.charAt(0)}</div>
    <p class="item-name">${item.name} ${noMediaBadge}</p>
    <button type="button" class="item-equip-btn ${item.equipped ? 'is-equipped' : ''}" data-instance-id="${item.instanceId}">
      ${item.equipped ? 'Unequip' : 'Equip'}
    </button>
  `;

  card.querySelector('.item-equip-btn').addEventListener('click', () => toggleEquip(item.instanceId, item.equipped));

  return card;
};

const renderGrid = (gridEl, items) => {
  gridEl.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'inventory-empty';
    empty.textContent = 'Nothing here yet — visit the shop to get some!';
    gridEl.appendChild(empty);
    return;
  }

  const sorted = [...items].sort((a, b) => Number(b.equipped) - Number(a.equipped));
  sorted.forEach((item) => gridEl.appendChild(renderInventoryCard(item)));
};

const loadInventory = async () => {
  try {
    const data = await apiFetch('/inventory');

    const characters = data.inventory.filter((item) => item.type === 'character');
    const backgrounds = data.inventory.filter((item) => item.type === 'background');

    renderGrid(characterGridEl, characters);
    renderGrid(backgroundGridEl, backgrounds);
  } catch (error) {
    characterGridEl.innerHTML = '<p class="inventory-empty">Could not load your inventory right now.</p>';
  }
};

const toggleEquip = async (instanceId, currentlyEquipped) => {
  try {
    await apiFetch(`/inventory/${instanceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ equipped: !currentlyEquipped }),
    });
    await loadInventory();
  } catch (error) {
    await loadInventory();
  }
};

renderNav();
loadInventory();