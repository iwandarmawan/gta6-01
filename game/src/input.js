// Keyboard + mouse input. One shared state object; the game reads it each frame.
export function makeInput() {
  const keys = {};
  const input = {
    up: false, down: false, left: false, right: false,
    shoot: false, brake: false,
    pressed: {}, // one-shot keys, consumed by the game each frame
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    input.pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('mousedown', () => {
    input.shoot = true;
  });
  window.addEventListener('mouseup', () => {
    input.shoot = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    input.shoot = false;
  });
  input.poll = () => {
    input.up = keys.KeyW || keys.ArrowUp;
    input.down = keys.KeyS || keys.ArrowDown;
    input.left = keys.KeyA || keys.ArrowLeft;
    input.right = keys.KeyD || keys.ArrowRight;
    input.brake = keys.Space;
  };
  input.consume = (code) => {
    const hit = !!input.pressed[code];
    input.pressed[code] = false;
    return hit;
  };
  input.clearPressed = () => {
    for (const k of Object.keys(input.pressed)) input.pressed[k] = false;
  };
  return input;
}
