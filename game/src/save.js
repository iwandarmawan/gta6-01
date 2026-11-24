// Save and load for Solmar Bay: cash, finished missions, garage upgrades and
// the best taxi streak, kept in localStorage under one key. A missing or
// broken save is a fresh start, never an error.

const KEY = 'solmar-bay-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number') return null;
    return {
      cash: data.cash,
      completed: Array.isArray(data.completed) ? data.completed : [],
      upgrades: data.upgrades || { engine: false, armor: false },
      fares: data.fares || 0,
    };
  } catch (err) {
    return null;
  }
}

export function writeSave(G) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: Math.round(G.player.cash),
      completed: G.completed,
      upgrades: G.upgrades,
      fares: G.stats.fares,
    }));
  } catch (err) {
    // Storage can be full or blocked; the game plays on regardless.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    // Ignore: nothing depends on the removal succeeding.
  }
}
