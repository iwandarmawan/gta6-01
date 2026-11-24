// Save / load: cash, mission progress and garage upgrades in localStorage.
// The key is versioned per build so an old save never corrupts a new one.
const KEY = 'solmar-bay-v12';

export function saveGame(G) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: G.cash,
      missionIndex: G.missions.index,
      engine: !!G.stats.engine,
      armor: !!G.stats.armor,
      score: G.score,
    }));
  } catch (e) {
    // Storage unavailable (private mode, etc.) — the game still plays.
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}
