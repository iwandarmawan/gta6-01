// save.js — localStorage save of cash, garage upgrades and mission progress.
const KEY = 'solmar-bay-dawn-save-v1';
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cash: 0, engine: false, armor: false, mission: 0, hp: 100 };
    const s = JSON.parse(raw);
    return { cash: s.cash | 0, engine: !!s.engine, armor: !!s.armor, mission: s.mission | 0, hp: 100 };
  } catch { return { cash: 0, engine: false, armor: false, mission: 0, hp: 100 }; }
}
export function storeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash, engine: state.engine, armor: state.armor, mission: state.mission,
    }));
  } catch { /* storage is a bonus, never fatal */ }
}
