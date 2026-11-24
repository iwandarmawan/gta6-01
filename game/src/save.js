// Save: cash and garage upgrades persist in localStorage between sessions.
// Everything is guarded — private mode and headless runs just get a fresh game.
const KEY = 'solmar-bay-v10';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // No storage available; the game still plays.
  }
}
