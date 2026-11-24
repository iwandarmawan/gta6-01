// Missions: Rico Marlowe's six-job night arc for Vera Costa, then repeatable
// taxi fares. A beacon pillar marks the target; timers and package counts
// drive the objectives. All positions are world coordinates.
import { MISSIONS, FARES, POI } from './config.js';

const BEACONS = {
  wheels: { x: 6, z: -4 },
  harbour: { x: POI.lighthouse.x, z: POI.lighthouse.z + 8 },
  taxi: { x: POI.plaza.x, z: POI.plaza.z },
  courier: [
    { x: -80, z: 40 }, { x: 120, z: -60 }, { x: POI.marina.x, z: POI.marina.z + 6 },
  ],
  leap: { x: POI.airfield.x, z: POI.airfield.z },
  cache: [
    { x: -178, z: -168 }, { x: -192, z: -160 }, { x: -170, z: -185 },
    { x: -196, z: -178 }, { x: -182, z: -150 },
  ],
};

export function makeMissions() {
  return {
    index: 0,
    phase: 'brief', // brief | active | done
    timer: 0,
    drop: 0,
    fare: null,
    fareStep: 0,
    toast: '',
    toastIn: 0,
  };
}

export function currentMission(m) {
  return MISSIONS[m.index] || null;
}

export function missionBeacon(m) {
  const cur = currentMission(m);
  if (!cur) return null;
  if (m.fare) return m.fareStep === 0 ? { x: 0, z: 0 } : { x: POI.airfield.x, z: POI.airfield.z };
  const b = BEACONS[cur.id];
  if (Array.isArray(b)) return b[Math.min(m.drop, b.length - 1)];
  return b;
}

export function startMission(m, G) {
  const cur = currentMission(m);
  if (!cur) return;
  m.phase = 'active';
  m.timer = cur.time || 0;
  m.drop = 0;
  m.toast = `${cur.name} — $${cur.pay}`;
  m.toastIn = 3;
  G.objective = cur.text;
}

export function updateMissions(m, G, dt) {
  if (m.toastIn > 0) m.toastIn -= dt;
  const cur = currentMission(m);
  if (m.phase === 'brief' && cur) {
    startMission(m, G);
    return;
  }
  if (!cur || m.phase !== 'active') return;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.toast = 'Too slow — the job fell through';
      m.toastIn = 3;
      m.index += 1;
      m.phase = 'brief';
      G.objective = 'Find the next job';
      return;
    }
  }
  const b = missionBeacon(m);
  if (!b) return;
  const px = G.player.position.x;
  const pz = G.player.position.z;
  const d = Math.hypot(px - b.x, pz - b.z);
  if (d < 7) {
    if (Array.isArray(BEACONS[cur.id])) {
      m.drop += 1;
      G.cash += 0; // paid at the end of the chain
      if (m.drop >= BEACONS[cur.id].length) {
        G.cash += cur.pay;
        G.score += cur.pay;
        m.toast = `${cur.name} complete — $${cur.pay}`;
        m.toastIn = 3;
        m.index += 1;
        m.phase = 'brief';
        G.objective = 'Find the next job';
      } else {
        G.objective = `${cur.text} (${m.drop}/${BEACONS[cur.id].length})`;
      }
    } else if (cur.id === 'wheels') {
      // Stealing the car is the objective; reaching the sedan counts.
      G.cash += cur.pay;
      G.score += cur.pay;
      m.toast = `${cur.name} complete — $${cur.pay}`;
      m.toastIn = 3;
      m.index += 1;
      m.phase = 'brief';
      G.objective = 'Find the next job';
    } else {
      G.cash += cur.pay;
      G.score += cur.pay;
      m.toast = `${cur.name} complete — $${cur.pay}`;
      m.toastIn = 3;
      m.index += 1;
      m.phase = 'brief';
      G.objective = 'Find the next job';
    }
  }
}

export function startFare(m, G) {
  if (m.index < MISSIONS.length) return false;
  m.fare = FARES[Math.floor(Math.random() * FARES.length)];
  m.fareStep = 0;
  m.timer = 90;
  m.phase = 'active';
  G.objective = `Taxi: pick up at ${m.fare.from}`;
  m.toast = `Taxi fare — $${m.fare.pay}`;
  m.toastIn = 3;
  return true;
}
