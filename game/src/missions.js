// Missions and activities for Solmar Bay: Vera Costa's job arc, the
// objective beacon, the lighthouse collectibles and the repeatable taxi
// fares. One mission runs at a time; finishing one starts the next.

const THREE = window.THREE;
import { MISSIONS, TAXI_FARES } from './config.js';
import { playPickup, playMissionComplete } from './audio.js';
import { addWanted } from './police.js';
import { writeSave } from './save.js';

function showMessage(G, text, dur) {
  G.messages.push({ text, until: G.elapsed + (dur || 4) });
  if (G.messages.length > 4) G.messages.shift();
}

export function startMission(G, index) {
  const def = MISSIONS[index];
  if (!def) {
    G.mission = null;
    showMessage(G, 'All of Vera\u2019s jobs are done. Solmar Bay is yours.', 6);
    return;
  }
  G.mission = {
    def,
    index,
    step: 0,
    timer: def.timeLimit || 0,
    collected: 0,
    delay: 0,
  };
  if (def.wanted) addWanted(G, def.wanted);
  showMessage(G, `${def.title} — ${def.brief}`, 6);
  placeBeacon(G);
}

export function currentObjective(G) {
  if (G.mission) {
    const step = G.mission.def.steps[G.mission.step];
    if (!step) return null;
    if (step.type === 'collect') {
      return { text: step.text.replace('(0/5)', `(${G.mission.collected}/5)`), x: null, z: null };
    }
    if (step.type === 'enter') return { text: step.text, x: null, z: null };
    return { text: step.text, x: step.x, z: step.z };
  }
  if (G.fare) {
    const target = G.fare.stage === 0 ? G.fare.from : G.fare.to;
    return {
      text: G.fare.stage === 0 ? 'Pick up the taxi fare' : 'Drop the fare off',
      x: target.x,
      z: target.z,
    };
  }
  return { text: 'Free roam — explore Solmar Bay', x: null, z: null };
}

function placeBeacon(G) {
  const obj = currentObjective(G);
  if (!G.beacon) {
    const group = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 15;
    group.add(beam);
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 3, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd21f }),
    );
    arrow.position.y = 8;
    arrow.rotation.x = Math.PI;
    group.add(arrow);
    group.userData.arrow = arrow;
    G.scene.add(group);
    G.beacon = group;
  }
  // An "enter a vehicle" step has no fixed point: point at the nearest car.
  if (obj && obj.x === null && G.mission) {
    const step = G.mission.def.steps[G.mission.step];
    if (step && step.type === 'enter') {
      let best = null;
      let bestD = 1e9;
      for (const v of G.vehicles) {
        if (v.driver) continue;
        if (step.vehicle !== 'any' && v.kind !== step.vehicle) continue;
        const dx = v.pos.x - G.player.pos.x;
        const dz = v.pos.z - G.player.pos.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      }
      if (best) {
        G.beacon.visible = true;
        G.beacon.position.set(best.pos.x, 0, best.pos.z);
        return;
      }
    }
  }
  if (obj && obj.x !== null) {
    G.beacon.visible = true;
    G.beacon.position.set(obj.x, 0, obj.z);
  } else {
    G.beacon.visible = false;
  }
}

export function updateMission(G, dt) {
  // The beacon arrow bobs over the current objective.
  if (G.beacon && G.beacon.visible) {
    G.beacon.userData.arrow.position.y = 8 + Math.sin(G.elapsed * 3) * 1.2;
    G.beacon.rotation.y += dt * 0.8;
  }
  if (G.mission && G.mission.delay > 0) {
    G.mission.delay -= dt;
    if (G.mission.delay <= 0) startMission(G, G.mission.index + 1);
    return;
  }
  if (G.mission) {
    const m = G.mission;
    if (m.timer > 0) {
      m.timer -= dt;
      if (m.timer <= 0) {
        showMessage(G, 'Time\u2019s up — Vera will wait. The job restarts.', 5);
        startMission(G, m.index);
        return;
      }
    }
    const step = m.def.steps[m.step];
    if (!step) return;
    const p = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
    if (step.type === 'enter') {
      const v = G.player.vehicle;
      if (v && (step.vehicle === 'any' || v.kind === step.vehicle)) completeStep(G);
    } else if (step.type === 'goto') {
      const dx = p.x - step.x;
      const dz = p.z - step.z;
      if (Math.sqrt(dx * dx + dz * dz) < step.radius) completeStep(G);
    } else if (step.type === 'jump') {
      const v = G.player.vehicle;
      if (v && v.airborne) {
        const dx = p.x - step.x;
        const dz = p.z - step.z;
        if (Math.sqrt(dx * dx + dz * dz) < step.radius + 10) completeStep(G);
      }
    } else if (step.type === 'collect') {
      for (const cache of G.city.caches) {
        if (cache.taken) continue;
        const dx = p.x - cache.x;
        const dz = p.z - cache.z;
        if (Math.sqrt(dx * dx + dz * dz) < 3) {
          cache.taken = true;
          cache.mesh.visible = false;
          m.collected += 1;
          G.player.cash += 100;
          playPickup(G.audio);
          showMessage(G, `Package found (${m.collected}/5) — +$100`, 3);
        }
      }
      if (m.collected >= step.count) completeStep(G);
    }
    placeBeacon(G);
    return;
  }
  // No mission running: the taxi fare activity.
  if (G.faresUnlocked && !G.fare && !G.fareCooldown) {
    const fare = TAXI_FARES[G.stats.fares % TAXI_FARES.length];
    G.fare = { from: fare.from, to: fare.to, pay: fare.pay, stage: 0 };
    showMessage(G, 'A fare is waiting — drive to the pickup marker.', 4);
    placeBeacon(G);
  }
  if (G.fare) {
    const p = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
    const target = G.fare.stage === 0 ? G.fare.from : G.fare.to;
    const dx = p.x - target.x;
    const dz = p.z - target.z;
    if (Math.sqrt(dx * dx + dz * dz) < 8) {
      if (G.fare.stage === 0) {
        G.fare.stage = 1;
        showMessage(G, 'Fare aboard — drive them to the destination.', 4);
      } else {
        G.player.cash += G.fare.pay;
        G.stats.fares += 1;
        playPickup(G.audio);
        showMessage(G, `Fare delivered — +$${G.fare.pay}`, 4);
        G.fare = null;
        G.fareCooldown = 10;
        writeSave(G);
      }
    }
    placeBeacon(G);
  }
  if (G.fareCooldown) G.fareCooldown = Math.max(0, G.fareCooldown - dt);
}

function completeStep(G) {
  const m = G.mission;
  m.step += 1;
  playPickup(G.audio);
  if (m.step >= m.def.steps.length) {
    G.player.cash += m.def.reward;
    G.completed.push(m.def.id);
    playMissionComplete(G.audio);
    showMessage(G, `${m.def.title} complete — +$${m.def.reward}`, 5);
    if (m.def.id === 'taxi-fare') G.faresUnlocked = true;
    writeSave(G);
    G.mission.delay = 2.5;
  }
  placeBeacon(G);
}

export { showMessage };
