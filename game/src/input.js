// Keyboard and mouse input: held keys, edge-triggered presses,
// camera orbit drag and wheel zoom. No pointer lock, so it also
// works in a headless screenshot run.

export function createInput(target) {
  const down = new Set();
  const pressed = new Set();
  const state = {
    down,
    pressed,
    mouseDX: 0,
    mouseDY: 0,
    wheel: 0,
    dragging: false,
    anyKey: false,
  };

  function codeOf(e) {
    return e.code || e.key;
  }

  function onKeyDown(e) {
    const c = codeOf(e);
    if (!c) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) {
      e.preventDefault();
    }
    if (!down.has(c)) pressed.add(c);
    down.add(c);
    state.anyKey = true;
  }

  function onKeyUp(e) {
    down.delete(codeOf(e));
  }

  function onBlur() {
    down.clear();
  }

  let lastX = 0;
  let lastY = 0;
  function onMouseDown(e) {
    state.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseMove(e) {
    if (!state.dragging) return;
    state.mouseDX += e.clientX - lastX;
    state.mouseDY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseUp() {
    state.dragging = false;
  }
  function onWheel(e) {
    state.wheel += e.deltaY;
    e.preventDefault();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);
  target.addEventListener('mousedown', onMouseDown);
  target.addEventListener('mousemove', onMouseMove);
  target.addEventListener('mouseup', onMouseUp);
  target.addEventListener('wheel', onWheel, { passive: false });

  // True while any of the given codes is held.
  state.isDown = function isDown(codes) {
    for (const c of codes) if (down.has(c)) return true;
    return false;
  };

  // True once, on the frame the key went down.
  state.wasPressed = function wasPressed(codes) {
    for (const c of codes) if (pressed.has(c)) return true;
    return false;
  };

  // Call once per frame after the game has read the input.
  state.endFrame = function endFrame() {
    pressed.clear();
    state.mouseDX = 0;
    state.mouseDY = 0;
    state.wheel = 0;
    state.anyKey = false;
  };

  return state;
}
