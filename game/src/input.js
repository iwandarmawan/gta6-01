// Keyboard and mouse state, read once a frame by the player controller.
export function createInput() {
  const keys = new Set();
  const input = {
    keys,
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    // True while the key is held down.
    down(code) {
      return keys.has(code);
    },
  };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
  });
  addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  return input;
}
