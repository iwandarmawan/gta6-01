// shots.js — scripted dawn screenshots, seed=3.
// Every shot stages the game through its own code (real positions, real HUD),
// then the main loop freezes time (dt = 0) so the staged state survives.
import { placeCar } from './cars.js';
import { placeBeacon } from './missions.js';

function setCam(state, x, y, z, lookX, lookY, lookZ) {
  state.camera.position.set(x, y, z);
  state.camera.lookAt(lookX, lookY, lookZ);
}

export function stageShot(state, name) {
  const { player, sedan, pickup, skiff, police, heli, traffic } = state;
  state.shotMode = true;
  state.missions.phase = 'done'; // missions never overwrite the staged objective
  // Park the ambient traffic/peds out of the frame unless a shot needs them.
  for (const c of traffic) { c.position.set(500, 0, 500); }
  heli.position.set(500, 60, 500);

  if (name === 'chase') {
    // COVER: dawn chase on the coast road, lighthouse ahead, heli spotlight on.
    // Sedan and police head SOUTH (heading 0) toward the lighthouse point.
    state.vehicle = sedan;
    placeCar(sedan, 0, 60, 0, 77 / 3.6);
    placeCar(police[0], -4, 84, 0, 30);
    placeCar(police[1], 4, 92, 0, 30);
    // Heli low and close so the spotlight cone reads in the cover frame.
    heli.position.set(12, 12, 70);
    heli.lookAt(sedan.position.x, 0, sedan.position.z);
    state.wanted = 4;
    state.missions.objective = 'Reach the lighthouse point';
    state.missions.timer = 0;
    placeBeacon(state.beacon, 0, 175);
    state.beaconPos = { x: 0, z: 175 };
    // One traffic car ahead with headlights on, one ped on the sidewalk.
    placeCar(traffic[0], 2, 108, 0, 14);
    state.peds[0].position.set(-8, 0, 72);
    setCam(state, 5, 7, 46, sedan.position.x, 2, sedan.position.z + 14);
  } else if (name === 'play') {
    // On foot at Palm Plaza: Rico walks to the red sedan under the beacon.
    // Camera raised and shifted so no plaza palm trunk blocks the frame.
    state.vehicle = null;
    player.position.set(-2, 0, 16);
    player.rotation.y = Math.PI * 0.85;
    placeCar(sedan, 8, 6, Math.PI * 0.75, 0);
    state.wanted = 0;
    state.missions.objective = 'Steal a car (walk up and press E)';
    state.missions.timer = 0;
    placeBeacon(state.beacon, 8, 6);
    state.beaconPos = { x: 8, z: 6 };
    state.peds[0].position.set(-14, 0, -6);
    state.peds[1].position.set(16, 0, 18);
    // Low, close camera: Rico centre-left, sedan + beacon centre-right.
    setCam(state, -10, 6, 28, 3, 1.5, 8);
  } else if (name === 'drive') {
    // Driving the orange pickup up the coast road at dawn, fare timer running.
    // Pickup heads NORTH (heading PI) toward Palm Plaza; camera behind it.
    state.vehicle = pickup;
    placeCar(pickup, 0, 100, Math.PI, 70 / 3.6);
    state.wanted = 0;
    state.missions.objective = 'Pick up the fare at Palm Plaza — 90s';
    state.missions.timer = 90;
    placeBeacon(state.beacon, 0, 0);
    state.beaconPos = { x: 0, z: 0 };
    placeCar(traffic[0], 1, 80, Math.PI, 13);
    state.peds[0].position.set(-7, 0, 88);
    setCam(state, 0, 8, 118, 0, 1.5, 90);
  } else if (name === 'mission') {
    // Mission: the skiff in open water (clear of the dock colliders) heading
    // for the lighthouse, beam sweeping the dawn sea.
    state.vehicle = skiff;
    placeCar(skiff, 40, 190, Math.atan2(0 - 40, 178 - 190), 38 / 3.6);
    state.wanted = 2;
    state.missions.objective = 'Reach the lighthouse point';
    state.missions.timer = 0;
    placeBeacon(state.beacon, 0, 178);
    state.beaconPos = { x: 0, z: 178 };
    // Side-on camera: the skiff shows its full length, lighthouse behind it.
    setCam(state, 68, 6, 182, 32, 2, 190);
  } else {
    // Unknown shot: fall back to the plaza.
    state.vehicle = null;
    player.position.set(0, 0, 10);
    setCam(state, -12, 9, 28, 0, 2, 0);
  }
  state.toast = '';
}
