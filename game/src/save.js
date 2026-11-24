// save.js — localStorage save/load, guarded (file:// and headless may refuse).
const KEY = 'solmar-bay-storm-save-v1';
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return null;
    return s;
  } catch (e) { return null; }
}
export function saveGame(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash, missionIndex: state.missions.index,
      engine: state.upgrades.engine, armor: state.upgrades.armor,
      maxHealth: state.maxHealth, health: state.health,
    }));
  } catch (e) { /* save is a bonus, never fatal */ }
}
