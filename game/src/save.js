// Solmar Bay — save/load via localStorage.
// Keeps the player's cash, best mission and mute setting between visits.
// Storage can be off (private windows): then everything lasts one visit.

// Save shape version: bump when the shape changes so old saves are ignored.
const SAVE_KEY = 'solmar-bay.save.v1';
const SAVE_VERSION = 1;

export function loadSave() {
  const fallback = { cash: 250, bestMission: 0, muted: false, done: [] };
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return fallback;
    return {
      cash: typeof data.cash === 'number' ? data.cash : fallback.cash,
      bestMission: typeof data.bestMission === 'number' ? data.bestMission : 0,
      muted: data.muted === true,
      done: Array.isArray(data.done) ? data.done.filter((n) => typeof n === 'number') : [],
    };
  } catch {
    // Corrupt save or storage off: start fresh, never crash the game.
    return fallback;
  }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      cash: state.cash,
      bestMission: state.bestMission,
      muted: state.muted,
      done: state.done,
    }));
  } catch {
    // Storage off: the game keeps running, the save just does not persist.
  }
}

// Autosave on pause, mission complete and busted/wasted: cheap, and the
// player never loses progress to a closed tab.
export function autosave(game) {
  writeSave({
    cash: game.cash,
    bestMission: game.missions.bestDone,
    muted: game.audio.muted,
    done: game.missions.done,
  });
}

// Wipe the save entirely (used by the title screen's fresh-start path).
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to wipe.
  }
}
