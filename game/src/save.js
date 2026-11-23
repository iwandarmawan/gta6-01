// Save game: cash, story progress and best wanted level, kept in
// localStorage. Every call is guarded — a browser that blocks
// storage simply plays without saving.

import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return { cash: 200, missionsDone: 0, bestWanted: 0, storyComplete: false, muted: false };
}

export function loadSave() {
  const save = defaultSave();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return save;
    const data = JSON.parse(raw);
    if (typeof data.cash === 'number') save.cash = data.cash;
    if (typeof data.missionsDone === 'number') save.missionsDone = data.missionsDone;
    if (typeof data.bestWanted === 'number') save.bestWanted = data.bestWanted;
    if (typeof data.storyComplete === 'boolean') save.storyComplete = data.storyComplete;
    if (typeof data.muted === 'boolean') save.muted = data.muted;
  } catch (err) {
    // Storage unavailable or corrupt: play with a fresh save.
  }
  return save;
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (err) {
    // Storage unavailable: nothing to do.
  }
}
