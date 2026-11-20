// Save: cash, the highest job finished, and the mute setting, in
// localStorage. Storage can be off (private windows) — then the save lasts
// this visit only and nothing throws.
import { SAVE_KEY, ECONOMY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    // A save from an older build shape is not trusted: start fresh.
    if (data.version !== undefined && data.version !== 3) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: 3 }));
  } catch {
    // Storage off: the save is session-only, and the game still runs.
  }
}

export function freshSave() {
  return { cash: ECONOMY.startCash, bestMission: 0, muted: false };
}

/** Wipe the save (fresh start next visit). */
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to wipe.
  }
}
