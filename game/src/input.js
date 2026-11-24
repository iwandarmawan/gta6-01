// input.js — keyboard state with edge detection (E enter/exit car, F shoot).
export function createInput() {
  const keys = {};
  const pressedEdge = {};
  const watched = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF', 'ShiftLeft', 'KeyM', 'Enter'];
  function down(e) {
    if (watched.includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressedEdge[e.code] = true;
    keys[e.code] = true;
  }
  function up(e) { keys[e.code] = false; }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return {
    keys,
    down(code) { return !!keys[code]; },
    pressed(code) { const v = !!pressedEdge[code]; pressedEdge[code] = false; return v; },
    flushEdges() { for (const k in pressedEdge) pressedEdge[k] = false; },
    axis() {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      return { f, s };
    },
  };
}
