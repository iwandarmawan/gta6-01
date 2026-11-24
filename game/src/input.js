// input.js — keyboard state (WASD + arrows, E interact, F shoot, Shift run).
export const keys = {};
const MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'interact', KeyF: 'shoot',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
};
export function initInput() {
  window.addEventListener('keydown', (e) => {
    const k = MAP[e.code];
    if (k) { keys[k] = true; if (e.code === 'Space') e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = MAP[e.code];
    if (k) keys[k] = false;
  });
}
export function pressed(name) { return !!keys[name]; }
