// Mirrors the backend's src/utils/avatarPresets.js values exactly — kept
// here (not imported from there) because the frontend can't reach files
// outside src/frontend/. Placed right next to the shape definitions below
// so if a shape is ever added/removed, the option list to update sits right
// alongside it.
export const AVATAR_EYE_OPTIONS = ['round', 'sleepy', 'wink', 'star'];
export const AVATAR_MOUTH_OPTIONS = ['smile', 'grin', 'small', 'surprised'];

export const buildAvatarFace = (eyes, mouth) => {
  const eyeShapes = {
    round: '<circle cx="35" cy="45" r="5" fill="currentColor"></circle><circle cx="65" cy="45" r="5" fill="currentColor"></circle>',
    sleepy:
      '<path d="M28 45 Q35 50 42 45" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path><path d="M58 45 Q65 50 72 45" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>',
    wink:
      '<circle cx="35" cy="45" r="5" fill="currentColor"></circle><path d="M58 45 Q65 50 72 45" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>',
    star: '<path d="M35 38 L37 44 L43 44 L38 48 L40 54 L35 50 L30 54 L32 48 L27 44 L33 44 Z" fill="currentColor"></path><path d="M65 38 L67 44 L73 44 L68 48 L70 54 L65 50 L60 54 L62 48 L57 44 L63 44 Z" fill="currentColor"></path>',
  };

  const mouthShapes = {
    smile: '<path d="M38 65 Q50 75 62 65" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>',
    grin: '<path d="M32 65 Q50 82 68 65" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"></path>',
    small: '<line x1="42" y1="68" x2="58" y2="68" stroke="currentColor" stroke-width="3" stroke-linecap="round"></line>',
    surprised: '<circle cx="50" cy="70" r="6" fill="none" stroke="currentColor" stroke-width="3"></circle>',
  };

  const eyePart = eyeShapes[eyes] || eyeShapes.round;
  const mouthPart = mouthShapes[mouth] || mouthShapes.smile;

  return `
    <svg viewBox="0 0 100 100" role="img" aria-label="Avatar" style="color: var(--color-primary-deep);">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"></circle>
      ${eyePart}
      ${mouthPart}
    </svg>
  `;
};