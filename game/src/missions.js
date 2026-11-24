// Missions and story: Rico Marlowe runs jobs for Vera Costa across Solmar
// Bay. Six story missions plus repeatable taxi fares; garage progression
// (repair / engine / armor) is bought with mission cash.
import THREE from 'three';
import { MISSIONS, TAXI_FARES, GARAGE_PRICES, PLAZA, LIGHTHOUSE, MARINA, GARAGE, AIRFIELD } from './config.js';

const TARGETS = {
  'first-wheels': () => ({ x: PLAZA.x + 4, z: PLAZA.z + 6, text: 'Steal a car' }),
  'harbour-escape': () => ({ x: MARINA.x, z: MARINA.z, text: 'Reach the marina by boat' }),
  'city-taxi': () => ({ x: PLAZA.x, z: PLAZA.z, text: 'Pick up the fare at Palm Plaza', timer: 90 }),
  'sunset-courier': () => ({ x: AIRFIELD.x, z: AIRFIELD.z, text: 'Deliver 3 drops across the city', timer: 120 }),
  'rooftop-leap': () => ({ x: LIGHTHOUSE.x + 12, z: LIGHTHOUSE.z, text: 'Reach the lighthouse point' }),
  'lighthouse-cache': () => ({ x: LIGHTHOUSE.x + 8, z: LIGHTHOUSE.z + 4, text: 'Collect 5 packages at the lighthouse' }),
};

export function makeMissions(scene) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  scene.add(ring);
  const state = {
    index: 0,
    phase: 'active', // active | done
    cash: 0,
    dropsDone: 0,
    packagesDone: 0,
    timer: 0,
    fareIndex: 0,
    upgrades: { engine: false, armor: false },
    health: 100,
    ring,
  };
  setTarget(state, MISSIONS[0]);
  return state;
}

export function setTarget(state, mission) {
  const t = TARGETS[mission.id]();
  state.target = { x: t.x, z: t.z };
  state.objective = t.text;
  state.timer = t.timer || 0;
  state.ring.position.set(t.x, 0.1, t.z);
}

export function currentMission(state) {
  return MISSIONS[Math.min(state.index, MISSIONS.length - 1)];
}

export function completeMission(state) {
  const m = currentMission(state);
  state.cash += m.pay;
  state.phase = 'done';
  state.index = Math.min(state.index + 1, MISSIONS.length - 1);
  state.dropsDone = 0;
  state.packagesDone = 0;
  if (state.index < MISSIONS.length) setTarget(state, MISSIONS[state.index]);
  state.phase = 'active';
  return m;
}

export function startTaxiFare(state) {
  const fare = TAXI_FARES[state.fareIndex % TAXI_FARES.length];
  state.fareIndex += 1;
  state.objective = 'Pick up the fare at Palm Plaza — 90s';
  state.timer = 90;
  state.target = { x: PLAZA.x, z: PLAZA.z };
  state.ring.position.set(PLAZA.x, 0.1, PLAZA.z);
  return fare;
}

export function buyUpgrade(state, kind) {
  const price = GARAGE_PRICES[kind];
  if (kind === 'repair') {
    if (state.cash < price) return false;
    state.cash -= price;
    state.health = 100;
    return true;
  }
  if (state.cash < price || state.upgrades[kind]) return false;
  state.cash -= price;
  state.upgrades[kind] = true;
  if (kind === 'armor') state.health = Math.min(150, state.health + 50);
  return true;
}

export function updateMissions(state, playerPos, dt) {
  if (state.timer > 0) state.timer = Math.max(0, state.timer - dt);
  const d = Math.hypot(playerPos.x - state.target.x, playerPos.z - state.target.z);
  if (d < 5) {
    const m = currentMission(state);
    if (m.id === 'sunset-courier') {
      state.dropsDone += 1;
      if (state.dropsDone >= 3) completeMission(state);
      else state.objective = `Deliver 3 drops across the city (${state.dropsDone}/3)`;
    } else if (m.id === 'lighthouse-cache') {
      state.packagesDone += 1;
      if (state.packagesDone >= 5) completeMission(state);
      else state.objective = `Collect 5 packages at the lighthouse (${state.packagesDone}/5)`;
    } else {
      completeMission(state);
    }
  }
  // Beacon ring pulse.
  const s = 1 + Math.sin(Date.now() * 0.003) * 0.12;
  state.ring.scale.set(s, s, 1);
}
