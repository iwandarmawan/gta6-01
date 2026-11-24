// Missions: Rico's story, one job at a time, and the repeatable taxi fares
// after it. A mission is a list of steps; each step names a place and what
// reaching it means — steal, board, pick up, drop off, collect or just get
// there. A tall yellow beacon marks the current step in the world, and the
// HUD shows its words. Finish the step list and the reward is paid.
import { MISSIONS, FARES, WANTED } from './config.js';
import { addWanted } from './combat.js';

const THREE = window.THREE;

export function makeMissions(scene) {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  );
  beacon.visible = false;
  scene.add(beacon);
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.6 }),
  );
  marker.visible = false;
  scene.add(marker);
  return {
    index: 0, step: 0, active: null, fare: null, fareStep: 0,
    timer: 0, beacon, marker,
    done: [],
  };
}

// The mission the player is on now, or null when the story is done.
export function currentMission(M) {
  return M.index < MISSIONS.length ? MISSIONS[M.index] : null;
}

// Start (or restart) the current story mission: show its first step.
export function startMission(G) {
  const M = G.missions;
  const mission = currentMission(M);
  if (!mission) return;
  M.active = mission;
  M.step = 0;
  M.timer = mission.time;
  showStep(G);
  G.hud.banner(`${mission.name} — $${mission.reward}`, mission.intro);
  if (mission.id === 'harbour') addWanted(G, WANTED.harbourStart);
}

// Show the current step: its words on the HUD, its beacon in the world.
function showStep(G) {
  const M = G.missions;
  const mission = M.active;
  if (!mission) return;
  const step = mission.steps[M.step];
  G.hud.setObjective(step.text, M.timer > 0 ? M.timer : 0);
  M.beacon.position.set(step.target.x, 30, step.target.z);
  M.beacon.visible = true;
  M.marker.position.set(step.target.x, 0.2, step.target.z);
  M.marker.visible = true;
}

// Start a repeatable taxi fare: pick up here, drop off there, get paid.
export function startFare(G) {
  const M = G.missions;
  if (M.active || M.fare) return false;
  const fare = FARES[G.fareIndex % FARES.length];
  G.fareIndex++;
  M.fare = fare;
  M.fareStep = 0;
  G.hud.setObjective(`Pick up the fare at ${fare.fromName}`, 0);
  G.hud.banner('Taxi fare', `Pick up at ${fare.fromName}, drop at ${fare.toName} — $${fare.reward}`);
  M.beacon.position.set(fare.from.x, 30, fare.from.z);
  M.beacon.visible = true;
  M.marker.position.set(fare.from.x, 0.2, fare.from.z);
  M.marker.visible = true;
  return true;
}

// Advance the story or the fare when the player reaches a step's place.
// Returns 'step' | 'done' | 'none'.
export function checkStep(G, px, pz) {
  const M = G.missions;
  if (M.active) {
    const step = M.active.steps[M.step];
    const d = Math.hypot(px - step.target.x, pz - step.target.z);
    if (d > step.radius) return 'none';
    // Some steps need more than arriving: stealing needs a car nearby.
    if (step.kind === 'steal' && !G.vehicle) return 'none';
    if (step.kind === 'boardBoat' && (!G.vehicle || G.vehicle.kind !== 'boat')) return 'none';
    G.audio.blip(990);
    M.step++;
    if (M.step >= M.active.steps.length) {
      completeMission(G);
      return 'done';
    }
    showStep(G);
    return 'step';
  }
  if (M.fare) {
    const target = M.fareStep === 0 ? M.fare.from : M.fare.to;
    const d = Math.hypot(px - target.x, pz - target.z);
    if (d > 9) return 'none';
    G.audio.blip(990);
    if (M.fareStep === 0) {
      M.fareStep = 1;
      G.hud.setObjective(`Drop the fare at ${M.fare.toName}`, 0);
      M.beacon.position.set(M.fare.to.x, 30, M.fare.to.z);
      M.marker.position.set(M.fare.to.x, 0.2, M.fare.to.z);
      return 'step';
    }
    G.cash += M.fare.reward;
    G.audio.cash();
    G.hud.banner('Fare paid', `+$${M.fare.reward} — the meter keeps running`);
    G.hud.setCash(G.cash);
    M.fare = null;
    M.beacon.visible = false;
    M.marker.visible = false;
    G.hud.setObjective('Press T for a taxi fare, or M for missions', 0);
    return 'done';
  }
  return 'none';
}

function completeMission(G) {
  const M = G.missions;
  const mission = M.active;
  G.cash += mission.reward;
  G.audio.cash();
  G.hud.banner(`${mission.name} complete`, `+$${mission.reward} from Vera Costa`);
  G.hud.setCash(G.cash);
  M.done.push(mission.id);
  M.index++;
  M.active = null;
  M.beacon.visible = false;
  M.marker.visible = false;
  const next = currentMission(M);
  if (next) {
    G.hud.setObjective(`Next job: ${next.name} — press M to start`, 0);
  } else {
    G.hud.setObjective('Story done — press T for taxi fares', 0);
  }
}

// Tick the mission clock; a timed mission fails when it runs out.
export function tickMission(G, dt) {
  const M = G.missions;
  if (!M.active || M.timer <= 0) return;
  M.timer -= dt;
  if (M.timer <= 0) {
    M.timer = 0;
    G.hud.banner(`${M.active.name} failed`, 'Out of time — press M to try again');
    M.active = null;
    M.step = 0;
    M.beacon.visible = false;
    M.marker.visible = false;
    G.hud.setObjective('Press M to retry the job', 0);
  } else {
    const step = M.active.steps[M.step];
    if (step) G.hud.setObjective(step.text, M.timer);
  }
}
