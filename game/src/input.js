// Keyboard and mouse input. Held keys give a steering direction and the
// on-foot movement vector; one-shot presses (confirm, pause, enter a car,
// punch, reload, weapon swap, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never
// counted twice. Clicking shoots the pistol when it is drawn.
import { KEYS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MUTE = 32;
export const ACTION_WEAPON1 = 64;
export const ACTION_WEAPON2 = 128;
export const ACTION_SHOOT = 256;

function has(list, code) {
  return list.indexOf(code) !== -1;
}

export function createInput(canvas, onShoot) {
  const held = new Set();
  let actions = 0;
  let mouseDown = false;

  function keyDown(event) {
    if (has(KEYS.confirm, event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (has(KEYS.pause, event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (has(KEYS.enter, event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (has(KEYS.punch, event.code)) {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (has(KEYS.reload, event.code)) {
      if (!event.repeat) actions |= ACTION_RELOAD;
    } else if (has(KEYS.mute, event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (has(KEYS.weapon, event.code)) {
      if (!event.repeat) actions |= event.code === 'Digit1' ? ACTION_WEAPON1 : ACTION_WEAPON2;
    } else {
      held.add(event.code);
    }
    if (has(KEYS.up, event.code) || has(KEYS.down, event.code) || has(KEYS.left, event.code)
      || has(KEYS.right, event.code) || has(KEYS.jump, event.code) || has(KEYS.run, event.code)) {
      held.add(event.code);
      event.preventDefault();
    }
  }

  function keyUp(event) {
    held.delete(event.code);
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    actions |= ACTION_SHOOT;
    if (onShoot) onShoot(event);
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  // A right-click menu would steal the game: the game never needs it.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    held(name) {
      if (name === 'up') return KEYS.up.some((c) => held.has(c));
      if (name === 'down') return KEYS.down.some((c) => held.has(c));
      if (name === 'left') return KEYS.left.some((c) => held.has(c));
      if (name === 'right') return KEYS.right.some((c) => held.has(c));
      if (name === 'jump') return KEYS.jump.some((c) => held.has(c));
      if (name === 'run') return KEYS.run.some((c) => held.has(c));
      return false;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Drop every queued press and every held key (screen changes use this). */
    clearActions() {
      actions = 0;
      held.clear();
      mouseDown = false;
    },
    isMouseDown() {
      return mouseDown;
    },
  };
}
