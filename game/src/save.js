// Save system: cash, mission progress and garage upgrades persist in
// localStorage under one key. Loading a partial save rebuilds story state
// from the mission definitions instead of crashing on null.
import { MISSIONS } from './config.js';

const KEY = 'solmar-bay-fog-save-v1';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash,
      index: state.index,
      upgrades: state.upgrades,
      health: state.health,
    }));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      cash: typeof d.cash === 'number' ? d.cash : 0,
      index: typeof d.index === 'number' && d.index >= 0 && d.index < MISSIONS.length ? d.index : 0,
      upgrades: d.upgrades && typeof d.upgrades === 'object'
        ? { engine: !!d.upgrades.engine, armor: !!d.upgrades.armor }
        : { engine: false, armor: false },
      health: typeof d.health === 'number' ? d.health : 100,
    };
  } catch (e) { return null; }
}
