// Rico's progress, kept in the browser's own storage: cash, garage upgrades and
// which jobs are done. Nothing leaves the machine; a fresh browser starts broke.
const KEY = 'solmar-bay-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 0,
      engine: data.engine === true,
      armor: data.armor === true,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      done: Array.isArray(data.done) ? data.done : [],
    };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash,
      engine: state.upgrades.engine,
      armor: state.upgrades.armor,
      missionIndex: state.missionIndex,
      done: state.doneMissions,
    }));
  } catch {
    // A browser that refuses storage still plays; it just forgets.
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
