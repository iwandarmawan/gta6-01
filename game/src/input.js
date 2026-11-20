// Solmar Bay — keyboard and mouse input.
// Held keys give a movement vector; one-shot presses (enter car, punch,
// reload, pause, mute) are queued as edge flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice.

export const EDGE_ENTER = 1; // E: enter / exit a car
export const EDGE_PUNCH = 2; // F: punch
export const EDGE_RELOAD = 4; // R: reload the pistol
export const EDGE_PAUSE = 8; // P or Escape: pause / resume
export const EDGE_MUTE = 16; // M: mute / unmute
export const EDGE_WEAPON = 32; // 1 / 2: switch fists / pistol
export const EDGE_JUMP = 64; // Space: jump (also click-to-start on title)
export const EDGE_START = 128; // click or Enter on the title screen

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(canvas) {
  const held = new Set();
  let edges = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  function press(code) {
    if (code === 'KeyE') edges |= EDGE_ENTER;
    else if (code === 'KeyF') edges |= EDGE_PUNCH;
    else if (code === 'KeyR') edges |= EDGE_RELOAD;
    else if (code === 'KeyP' || code === 'Escape') edges |= EDGE_PAUSE;
    else if (code === 'KeyM') edges |= EDGE_MUTE;
    else if (code === 'Digit1') edges |= EDGE_WEAPON;
    else if (code === 'Digit2') edges |= EDGE_WEAPON;
    else if (code === 'Space') edges |= EDGE_JUMP;
    else if (code === 'Enter') edges |= EDGE_START;
  }

  window.addEventListener('keydown', (event) => {
    // Shift is tracked too: it is the run modifier, not a direction.
    if (MOVE_KEYS.has(event.code) || event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.add(event.code);
    if (!event.repeat) press(event.code);
    // Keep the page from scrolling on game keys, but never block F5 / F12.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  // A key released while the tab is hidden never sends keyup: let go of
  // everything on blur so the player never drives off on their own.
  window.addEventListener('blur', () => { held.clear(); mouseDown = false; });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    edges |= EDGE_START;
  });
  // Right-click never opens the browser menu mid-firefight.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('pointerup', () => { mouseDown = false; });
  window.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  return {
    // Movement vector: x = right, z = forward (towards -z on screen is up).
    move() {
      const fwd = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      const right = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      return { fwd, right };
    },
    running() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    // One-shot presses since the last call, as EDGE_* flags.
    takeEdges() {
      const taken = edges;
      edges = 0;
      return taken;
    },
    mouseHeld() { return mouseDown; },
    mousePos() { return { x: mouseX, y: mouseY }; },
    // Let go of every key (used when pausing, so a held key never sticks).
    reset() { held.clear(); mouseDown = false; },
  };
}
