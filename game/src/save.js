// Save and load the player's progress (cash, upgrades, finished missions) in localStorage.
const KEY = 'solmar-bay-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        cash: state.cash,
        engine: state.upgrades.engine,
        armor: state.upgrades.armor,
        done: [...state.done],
      }),
    );
  } catch {
    // Storage may be unavailable (private mode, quota): the game plays on without it.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
