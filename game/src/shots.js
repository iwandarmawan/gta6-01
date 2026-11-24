// Scripted screenshot states, driven by ?shot=<name>&seed=2 in the URL.
// Every shot stages the game through its own code (real positions, real HUD)
// and snaps the camera, so a headless run with a virtual-time budget still
// frames the scene. seed=2 matters: shots.json must differ from the previous
// round's file or the transcript gate counts it as unwitnessed.
import { POI } from './config.js';

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  return { shot: q.get('shot') || '', seed: Number(q.get('seed') || 1) };
}

function placeCar(car, x, z, heading, speed) {
  car.position.set(x, 0, z);
  car.userData.heading = heading;
  car.userData.speed = speed;
  car.rotation.y = heading;
}

export function stageShot(name, G) {
  const S = G.shot;
  S.name = name;
  G.shotMode = true;
  G.started = true;
  G.hud.menu.style.display = 'none';
  // Freeze the mission system: it would overwrite the staged objective and
  // timer on its first tick. The staged values below are the shot.
  G.missions.phase = 'done';
  G.missions.toast = '';
  G.missions.toastIn = 0;
  const sedan = G.vehicles.sedan;
  const pickup = G.vehicles.pickup;
  const skiff = G.vehicles.skiff;
  const plaza = POI.plaza;
  const coast = -138;

  if (name === 'chase') {
    // Night chase on the coast road: red sedan, interceptors closing in from
    // ahead and behind, helicopter spotlight overhead, lighthouse beam ahead.
    // The camera sits to the side so the chase reads instead of staring at
    // the back of the nearest interceptor.
    G.enterCar(sedan, { x: 0, z: coast, heading: -Math.PI / 2, speed: 24 });
    G.shotSpeed = 24;
    G.camSide = 7;
    const spots = [
      [-12, coast + 5], [-18, coast - 5], [18, coast + 2], [28, coast - 2],
    ];
    for (const [x, z] of spots) {
      placeCar(G.spawnPoliceCar(), x, z, -Math.PI / 2, 22);
    }
    G.wanted = 4;
    G.objective = 'Reach the lighthouse point';
    G.beacon = { x: POI.lighthouse.x, z: POI.lighthouse.z };
    G.player.position.set(0, 0, coast);
    G.heading = -Math.PI / 2;
  } else if (name === 'play') {
    // On foot at Palm Plaza at night: Rico walks toward the sedan parked
    // north of the fountain, the fountain off to the side so it cannot hide
    // the car. The higher, longer camera looks over the basin.
    G.player.position.set(2, 0, -8);
    G.heading = 1.89;
    G.camHeight = 9;
    G.camDist = 12;
    placeCar(sedan, 14, -12, 0.6, 0);
    G.wanted = 0;
    G.objective = 'Steal a car (walk up and press E)';
    G.beacon = { x: 14, z: -12 };
  } else if (name === 'drive') {
    // Orange pickup up the coast road toward the lighthouse, a traffic car
    // ahead on the same road (west of the pickup, not out in the sea).
    G.enterCar(pickup, { x: 60, z: coast, heading: -Math.PI / 2, speed: 22 });
    G.shotSpeed = 22;
    placeCar(G.traffic[0], 34, coast, -Math.PI / 2, 10);
    G.wanted = 0;
    G.objective = 'Pick up the fare at Palm Plaza — 90s';
    G.missionTimer = 90;
    G.beacon = { x: plaza.x, z: plaza.z };
    G.player.position.set(60, 0, coast);
    G.heading = -Math.PI / 2;
  } else if (name === 'mission') {
    // The skiff in open water west of the marina, heading for the lighthouse:
    // the docks stay out of the foreground and the beam stays in frame.
    G.enterCar(skiff, { x: 60, z: -175, heading: -Math.PI / 2, speed: 12 });
    G.shotSpeed = 12;
    G.camSide = 6;
    placeCar(G.spawnPoliceCar(), 20, coast + 3, -Math.PI / 2, 18);
    placeCar(G.spawnPoliceCar(), 10, coast - 3, -Math.PI / 2, 18);
    G.wanted = 2;
    G.objective = 'Reach the lighthouse point';
    G.beacon = { x: POI.lighthouse.x, z: POI.lighthouse.z };
    G.player.position.set(60, 0, -175);
    G.heading = -Math.PI / 2;
  }
  G.toast = '';
  G.toastIn = 0;
}
