// Keyboard and mouse input for Solmar Bay. Tracks held keys, one-shot key
// presses (edges) and the camera drag, so the game loop reads state instead
// of wiring listeners everywhere.

export function createInput() {
  const input = {
    keys: {},
    pressed: {},
    mouseX: 0,
    mouseY: 0,
    dragging: false,
    lookDX: 0,
    lookDY: 0,
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys[event.code] = true;
    input.pressed[event.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys[event.code] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
    input.dragging = false;
  });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) input.dragging = true;
    input.mouseX = event.clientX;
    input.mouseY = event.clientY;
  });
  window.addEventListener('mouseup', () => {
    input.dragging = false;
  });
  window.addEventListener('mousemove', (event) => {
    if (!input.dragging) return;
    input.lookDX += event.clientX - input.mouseX;
    input.lookDY += event.clientY - input.mouseY;
    input.mouseX = event.clientX;
    input.mouseY = event.clientY;
  });
  return input;
}

export function keyHeld(input, code) {
  return !!input.keys[code];
}

export function keyPressed(input, code) {
  return !!input.pressed[code];
}

export function clearPressed(input) {
  input.pressed = {};
  input.lookDX = 0;
  input.lookDY = 0;
}

export function moveAxes(input) {
  let x = 0;
  let z = 0;
  if (input.keys.KeyW || input.keys.ArrowUp) z -= 1;
  if (input.keys.KeyS || input.keys.ArrowDown) z += 1;
  if (input.keys.KeyA || input.keys.ArrowLeft) x -= 1;
  if (input.keys.KeyD || input.keys.ArrowRight) x += 1;
  return { x, z };
}
