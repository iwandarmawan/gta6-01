// Keyboard input: WASD/arrows to drive or walk, E to enter/exit a vehicle,
// F to fire, R to repair at the garage.
export function makeInput() {
  const keys = {};
  const input = { forward: false, back: false, left: false, right: false, interact: false, fire: false, repair: false };
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE') input.interact = true;
    if (e.code === 'KeyF') input.fire = true;
    if (e.code === 'KeyR') input.repair = true;
    sync();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; sync(); });
  function sync() {
    input.forward = !!(keys.KeyW || keys.ArrowUp);
    input.back = !!(keys.KeyS || keys.ArrowDown);
    input.left = !!(keys.KeyA || keys.ArrowLeft);
    input.right = !!(keys.KeyD || keys.ArrowRight);
  }
  return input;
}
