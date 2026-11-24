// missions.js — the 6-mission story arc for Rico Marlowe / Vera Costa.
// In shot mode the staged objective must NOT be overwritten (v12 lesson):
// updateMissions returns early while state.shotMode is on.
import THREE from 'three';
import { MISSIONS, WORLD } from './config.js';
import { sfx } from './audio.js';

export function missionState(save) {
  return {
    index: save.mission || 0,
    phase: 'active', // active | done
    objective: MISSIONS[save.mission || 0].objective,
    timer: MISSIONS[save.mission || 0].time || 0,
    drops: 0, packages: 0,
  };
}

export function currentMission(missions) {
  return MISSIONS[Math.min(missions.index, MISSIONS.length - 1)];
}

export function makeBeacon() {
  const g = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 15;
  g.add(pillar);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.15;
  g.add(ring);
  return g;
}

export function placeBeacon(beacon, x, z) {
  beacon.position.set(x, 0, z);
  beacon.visible = true;
}

export function missionTarget(missions) {
  const m = currentMission(missions);
  switch (m.id) {
    case 'wheels': return { x: 8, z: 6 };
    case 'harbour': return { x: WORLD.marina.x, z: WORLD.marina.z };
    case 'taxi': return { x: WORLD.plaza.x, z: WORLD.plaza.z };
    case 'courier': return { x: 60, z: -60 };
    case 'rooftop': return { x: -60, z: -60 };
    case 'cache': return { x: WORLD.lighthouse.x, z: WORLD.lighthouse.z - 8 };
    default: return { x: 0, z: 0 };
  }
}

export function updateMissions(state, dt) {
  // Frozen shot mode: the staged objective/toast/timer/beacon stay exactly as staged.
  if (state.shotMode) return;
  const m = state.missions;
  const def = currentMission(m);
  if (m.phase === 'done') return;
  if (def.time) {
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = def.time;
      state.toast = 'Out of time — mission reset.';
      state.toastAt = performance.now();
    }
  }
  // Arrive at the beacon: complete the mission, pay out, advance.
  const t = missionTarget(m);
  const who = state.vehicle || state.player;
  const dx = who.position.x - t.x;
  const dz = who.position.z - t.z;
  if (dx * dx + dz * dz < 36) {
    state.cash += def.pay;
    sfx.cash();
    state.toast = `${def.name} complete — $${def.pay}`;
    state.toastAt = performance.now();
    m.index = Math.min(m.index + 1, MISSIONS.length - 1);
    m.phase = m.index >= MISSIONS.length - 1 && def.id === 'cache' ? 'done' : 'active';
    const next = currentMission(m);
    m.objective = next.objective;
    m.timer = next.time || 0;
  }
}
