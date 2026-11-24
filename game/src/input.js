// Keyboard and mouse, read fresh every frame. WASD or arrows move and drive,
// E gets in and out of cars, Space is the handbrake, G opens the garage,
// M opens the mission list, T starts a taxi fare, P pauses, and the mouse
// aims and fires. Clicking the canvas also unlocks sound (browsers insist).
export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 0, mouseY: 0, clicked: false,
    // True while any of the given keys is held.
    down(...names) { return names.some((n) => keys.has(n)); },
    // Edge-triggered presses, consumed once by the game loop.
    pressed: new Set(),
    consume(name) {
      if (input.pressed.has(name)) { input.pressed.delete(name); return true; }
      return false;
    },
  };
  const code = (e) => e.code;
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(code(e));
    keys.add(code(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(code(e)));
  window.addEventListener('blur', () => { keys.clear(); });
  canvas.addEventListener('mousemove', (e) => { input.mouseX = e.clientX; input.mouseY = e.clientY; });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.clicked = true; input.pressed.add('Mouse0'); }
  });
  canvas.addEventListener('mouseup', (e) => { if (e.button === 0) input.clicked = false; });
  return input;
}
