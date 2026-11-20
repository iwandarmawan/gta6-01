// Missions: Rico Vega's arc under fixer Delgado. Four playable jobs, each
// with a briefing, a glowing waypoint marker, a minimap blip, an objective
// line, success and fail, and a cash reward. The fifth job stays locked
// until the first four are done. Cash pickups scattered around the city pay
// $50 each and are collected by driving or walking over them.
const THREE = window.THREE;
import { MISSIONS, ECONOMY, PLAYER } from './config.js';
import { spawnEnemy } from './combat.js';

export function createMissions(G, scene) {
  // The waypoint marker: a tall golden beam with a spinning ring.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beam.visible = false;
  scene.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.18, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc93c }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  // Cash pickups: green glowing stacks.
  for (const p of G.city.pickups) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x39d353, emissive: 0x1a7a2a }),
    );
    mesh.position.set(p.x, 0.6, p.z);
    scene.add(mesh);
    p.mesh = mesh;
  }
  return { beam, ring, enemiesLeft: 0 };
}

export function setMarker(G, x, z) {
  G.missions.beam.position.set(x, 20, z);
  G.missions.beam.visible = true;
  G.missions.ring.position.set(x, 0.4, z);
  G.missions.ring.visible = true;
  G.mission.target = { x, z };
}

export function hideMarker(G) {
  G.missions.beam.visible = false;
  G.missions.ring.visible = false;
  G.mission.target = null;
}

export function startMission(G, id) {
  const def = MISSIONS[id - 1];
  G.mission = { id, stage: 'start', timer: 0, target: null, state: 'active', name: def.name, reward: def.reward };
  G.hud.toast(`JOB ${id}: ${def.name} — $${def.reward}`);
  if (id === 1) {
    G.mission.stage = 'steal';
    G.hud.objective('Steal any car — walk up to one and press E');
  } else if (id === 2) {
    G.mission.stage = 'pickup';
    setMarker(G, G.city.docks.x, G.city.docks.z);
    G.hud.objective('Pick up the package at the docks');
  } else if (id === 3) {
    G.mission.stage = 'deliver';
    G.mission.timer = 90;
    setMarker(G, G.city.northGate.x, G.city.northGate.z);
    G.hud.objective('Deliver across the city — 90 seconds!');
  } else if (id === 4) {
    G.mission.stage = 'meet';
    setMarker(G, G.city.park.x, G.city.park.z);
    G.hud.objective('Meet the informant in the park — on foot');
  }
  G.audio.sting();
}

export function completeMission(G) {
  const m = G.mission;
  G.cash += m.reward;
  G.missionsDone[m.id] = true;
  // Finishing a job patches Rico up a little — Delgado pays for the clinic.
  G.player.health = Math.min(PLAYER.health, G.player.health + 25);
  G.saveGame();
  G.hud.toast(`Job done: ${m.name} — $${m.reward}`);
  G.audio.sting();
  hideMarker(G);
  G.mission = { id: m.id, stage: 'done', timer: 0, target: null, state: 'done', name: m.name, reward: m.reward };
  // Chain the next job: brief it after a short beat.
  const next = m.id + 1;
  if (next <= 4) {
    G.pendingBrief = next;
    G.pendingBriefTimer = 2;
  }
}

export function failMission(G, reason) {
  const m = G.mission;
  hideMarker(G);
  G.mission = { id: m.id, stage: 'failed', timer: 0, target: null, state: 'failed', name: m.name, reward: m.reward };
  G.failReason = reason;
  G.audio.fail();
  // The job-failed screen offers a retry on Enter.
  G.mode = 'over';
  G.hud.showOver('JOB FAILED', `${reason}. Press Enter to retry ${m.name}.`);
}

export function enemyDown(G) {
  G.missions.enemiesLeft -= 1;
  if (G.missions.enemiesLeft <= 0 && G.mission.id === 4 && G.mission.stage === 'ambush') {
    G.mission.stage = 'escape';
    setMarker(G, G.city.safehouse.x, G.city.safehouse.z);
    G.hud.objective('Ambush cleared — escape to the safehouse!');
  }
}

function near(G, x, z, r) {
  const px = G.inCar ? G.car.x : G.player.x;
  const pz = G.inCar ? G.car.z : G.player.z;
  return Math.hypot(px - x, pz - z) < r;
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || m.state !== 'active') return;
  // Mission 3's clock runs down and fails the job at zero.
  if (m.id === 3 && m.stage === 'deliver') {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(G, 'Out of time — the delivery was late');
      return;
    }
  }
  if (m.id === 1) {
    if (m.stage === 'steal' && G.inCar) {
      m.stage = 'drive';
      setMarker(G, G.city.plaza.x, G.city.plaza.z);
      G.hud.objective('Drive to the plaza marker');
    } else if (m.stage === 'drive' && near(G, G.city.plaza.x, G.city.plaza.z, 10)) {
      // 10 m, not 6: the plaza fountain's collider keeps a car ~7 m out.
      completeMission(G);
    }
  } else if (m.id === 2) {
    if (m.stage === 'pickup' && near(G, G.city.docks.x, G.city.docks.z, 6)) {
      m.stage = 'escape';
      setMarker(G, G.city.safehouse.x, G.city.safehouse.z);
      G.hud.objective('Package grabbed — reach the safehouse, lose the heat!');
      if (G.wanted < 2) {
        G.wanted = 2;
        G.audio.siren(true);
      }
    } else if (m.stage === 'escape' && near(G, G.city.safehouse.x, G.city.safehouse.z, 6)) {
      completeMission(G);
    }
  } else if (m.id === 3) {
    if (m.stage === 'deliver' && near(G, G.city.northGate.x, G.city.northGate.z, 6)) {
      completeMission(G);
    }
  } else if (m.id === 4) {
    if (m.stage === 'meet' && !G.inCar && near(G, G.city.park.x, G.city.park.z, 5)) {
      m.stage = 'ambush';
      G.missions.enemiesLeft = 3;
      const px = G.city.park.x;
      const pz = G.city.park.z;
      spawnEnemy(G, G.scene, px + 12, pz - 8);
      spawnEnemy(G, G.scene, px - 10, pz + 10);
      spawnEnemy(G, G.scene, px + 4, pz + 14);
      G.combat.weapon = 'pistol';
      G.hud.objective('AMBUSH! Take down all three gunmen!');
      G.audio.sting();
      if (G.wanted < 1) G.wanted = 1;
    } else if (m.stage === 'escape' && near(G, G.city.safehouse.x, G.city.safehouse.z, 6)) {
      completeMission(G);
      G.wanted = 0;
    }
  }
  // Spinning ring under the marker, and pickups collected on the way.
  if (G.missions.ring.visible) G.missions.ring.rotation.z += dt * 1.5;
  for (const p of G.city.pickups) {
    if (p.taken) continue;
    const px = G.inCar ? G.car.x : G.player.x;
    const pz = G.inCar ? G.car.z : G.player.z;
    if (Math.hypot(px - p.x, pz - p.z) < 3) {
      p.taken = true;
      p.mesh.visible = false;
      G.cash += ECONOMY.pickupValue;
      G.hud.toast(`+$${ECONOMY.pickupValue} cash pickup`);
      G.audio.blip();
    }
  }
}
