// Staged screenshots: `?shot=chase|play|drive|mission&seed=1` puts the game into
// a fixed, deterministic state and a fixed camera, then reports #status ready.
// The game itself renders every pixel: nothing is faked or composited.
import { AIRFIELD, LIGHTHOUSE, MARINA, PLAZA } from './config.js';
import { makeVehicle } from './cars.js';
import { setBeacon } from './missions.js';

function placePlayer(G, x, z, heading) {
  const P = G.player;
  P.x = x;
  P.z = z;
  P.heading = heading;
  P.mesh.position.set(x, 0, z);
  P.mesh.rotation.y = heading;
}

function giveVehicle(G, kind, x, z, heading, speed) {
  const v = makeVehicle(kind, x, z, heading);
  v.driver = 'player';
  v.speed = speed;
  G.scene.add(v.group);
  G.player.vehicle = v;
  G.player.x = x;
  G.player.z = z;
  G.player.heading = heading;
  G.vehicles.push(v);
  return v;
}

function addPolice(G, spots) {
  for (const [x, z, heading] of spots) {
    const car = makeVehicle('police', x, z, heading);
    car.driver = 'police';
    car.speed = 24;
    G.scene.add(car.group);
    G.police.cars.push(car);
  }
}

function addTrafficCar(G, kind, x, z, heading, speed) {
  const v = makeVehicle(kind, x, z, heading);
  v.driver = 'traffic';
  v.speed = speed;
  G.scene.add(v.group);
  G.traffic.push(v);
  return v;
}

function fixedCamera(G, x, y, z, tx, ty, tz) {
  G.shotCam = true;
  G.camera.position.set(x, y, z);
  G.camera.lookAt(tx, ty, tz);
}

// Stage one named shot. Called once after the world is built.
export function stageShot(G, name) {
  const P = G.player;
  G.mode = 'shot';
  G.hud.showMenu(false);
  if (name === 'chase') {
    // Cover: a police chase on the coast road north of the marina, three stars,
    // mission objective up, the lighthouse ahead.
    P.wanted = 3;
    P.cash = 0;
    giveVehicle(G, 'sedan', 168, -60, Math.PI, 22);
    addPolice(G, [[168, -38, Math.PI], [164, -28, Math.PI]]);
    addTrafficCar(G, 'pickup', 172, -120, Math.PI, 10);
    addTrafficCar(G, 'sedan', 160, -150, 0, 11);
    G.mission = { def: { id: 'harbour', name: 'Harbour Escape', pay: 300, text: 'Reach the lighthouse point' }, index: 1, stage: 1, timer: 0 };
    setBeacon(G, LIGHTHOUSE[0], LIGHTHOUSE[1]);
    G.hud.objective('Reach the lighthouse point');
    fixedCamera(G, 158, 9, -2, 168, 1.5, -60);
  } else if (name === 'play') {
    // On foot at Palm Plaza, the mission beacon over the target sedan.
    P.wanted = 0;
    P.cash = 0;
    placePlayer(G, 60, 60, Math.PI);
    const target = makeVehicle('sedan', 60, 32, 0);
    G.scene.add(target.group);
    G.vehicles.push(target);
    G.mission = { def: { id: 'wheels', name: 'First Wheels', pay: 150, text: 'Steal a car (walk up and press E)' }, index: 0, stage: 0, timer: 0 };
    setBeacon(G, 60, 32);
    G.hud.objective('Steal a car (walk up and press E)');
    G.hud.banner('First Wheels — $150', 'Steal a car (walk up and press E)');
    fixedCamera(G, 60, 6.5, 84, 60, 1.2, 26);
  } else if (name === 'drive') {
    // Driving the pickup down the coast road on a taxi job, clear of the marina docks.
    P.wanted = 0;
    P.cash = 0;
    giveVehicle(G, 'pickup', 165, -40, Math.PI, 20);
    addTrafficCar(G, 'sedan', 170, -90, Math.PI, 11);
    addTrafficCar(G, 'pickup', 158, -130, 0, 10);
    G.mission = { def: { id: 'taxi', name: 'City Taxi', pay: 250, text: 'Pick up the fare at Palm Plaza' }, index: 2, stage: 0, timer: 90 };
    setBeacon(G, PLAZA[0], PLAZA[1]);
    G.hud.objective('Pick up the fare at Palm Plaza — 90s');
    fixedCamera(G, 165, 6, -8, 165, 1.5, -70);
  } else if (name === 'mission') {
    // The harbour escape: the skiff out on the open water by the marina, two stars,
    // shot from the sea side so the MARINA sign stays out of frame.
    P.wanted = 2;
    P.cash = 0;
    giveVehicle(G, 'boat', 200, 95, Math.PI, 11);
    G.mission = { def: { id: 'harbour', name: 'Harbour Escape', pay: 300, text: 'Reach the lighthouse point' }, index: 1, stage: 1, timer: 0 };
    setBeacon(G, LIGHTHOUSE[0], LIGHTHOUSE[1]);
    G.hud.objective('Reach the lighthouse point');
    fixedCamera(G, 210, 5, 120, 196, 1.5, 65);
  }
  // Let a few frames render, then report ready for the screenshot.
  let frames = 0;
  const tick = () => {
    frames++;
    if (frames >= 4) {
      document.getElementById('status').textContent = 'ready';
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return name;
}

export function shotNames() {
  return ['chase', 'play', 'drive', 'mission'];
}
