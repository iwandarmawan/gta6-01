// Keyboard and mouse input. Keys are held in a set; presses are edge-triggered
// and consumed once per frame so a single E press enters one car, not five.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.clicked = false;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', () => {
      this.clicked = true;
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
