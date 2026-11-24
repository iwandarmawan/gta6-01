// Scripted screenshot staging for Solmar Bay: each ?shot= name drives the
// game's own systems into a state worth photographing, then the game loop
// runs it. Nothing here fakes pixels — the shots are the game itself.

import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { spawnVehicle, enterVehicle } from './cars.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || null,
    seed: Number(params.get('seed') || '1'),
  };
}

// The staged camera tracks the player from a fixed side offset, so the
// action never drives out of frame while the shot runs.
function trackCamera(G, dx, height, dz, lookX, lookZ) {
  G.cameraOverride = { follow: true, dx, height, dz, lookX, lookZ };
}

function stagePolice(G, x, z, angle) {
  const v = spawnVehicle(G, 'police', x, z, angle, 0x1a2a4a);
  v.police = true;
  v.chaseSpeed = 12;
  G.police.push(v);
  return v;
}

export function applyShot(G, name) {
  G.dayT = 0.55;
  if (name === 'chase') {
    // Cover: a police chase on the bridge road — wanted stars, the minimap,
    // a mission objective, traffic and pedestrians in one frame.
    G.dayT = 0.62;
    const car = spawnVehicle(G, 'sedan', 0, 120, -Math.PI / 2, 0xc23a2e);
    enterVehicle(G, car);
    car.speed = 18;
    G.shotAutoDrive = true;
    startMission(G, 1);
    // Skip the "board the skiff" step: the chase is already under way, so
    // the objective reads "Reach the lighthouse point" instead.
    G.mission.step = 1;
    addWanted(G, 1);
    // Police close behind the player so the chase reads in the frame.
    stagePolice(G, -15, 122, -Math.PI / 2);
    stagePolice(G, -25, 118, -Math.PI / 2);
    // Traffic on the bridge road: a westbound sedan in the north lane and
    // an eastbound pickup in the south lane, so the player passes both.
    spawnVehicle(G, 'sedan', 50, 116, Math.PI / 2, 0x2e5ac2);
    spawnVehicle(G, 'pickup', 80, 124, -Math.PI / 2, 0xd98a2a);
    // Camera ahead-east and south of the player, looking back west down the
    // road: the player comes toward the lens with the police behind it, and
    // the road runs diagonally. Still north of the coast road.
    trackCamera(G, 18, 9, 22, -12, 0);
  } else if (name === 'foot') {
    // On foot in the city: the plaza, the HUD and a mission beacon.
    G.dayT = 0.45;
    G.player.pos.set(-6, 0, 14);
    G.player.angle = 0;
    startMission(G, 0);
    spawnVehicle(G, 'sedan', 24, 8, Math.PI / 2, 0x2e8f5a);
    spawnVehicle(G, 'pickup', -40, -8, 0, 0xd98a2a);
    // Look slightly north-east so the mission beacon over the sedan at
    // (24, 8) comes into frame at the right edge.
    trackCamera(G, 0, 4.5, 12, 10, -6);
  } else if (name === 'drive') {
    // Driving the coast road: the sea, the marina and the sunset light.
    G.dayT = 0.55;
    const car = spawnVehicle(G, 'pickup', -60, 160, -Math.PI / 2, 0xd98a2a);
    enterVehicle(G, car);
    car.speed = 16;
    G.shotAutoDrive = true;
    // City Taxi gives the drive a real objective instead of free roam.
    startMission(G, 2);
    spawnVehicle(G, 'sedan', -10, 160, -Math.PI / 2, 0xe8e0d0);
    spawnVehicle(G, 'sedan', 30, 154, Math.PI / 2, 0x2e5ac2);
    // Camera closer, lower and behind-left of the pickup, looking ahead
    // down the coast road so the truck reads large and the sea is behind it.
    trackCamera(G, -10, 5, -18, 8, 2);
  } else if (name === 'mission') {
    // Harbour Escape in progress: the skiff running the channel to the
    // lighthouse, with the bridge and the police above it.
    G.dayT = 0.5;
    const boat = spawnVehicle(G, 'boat', 60, 150, Math.PI, 0xf2f2f2);
    enterVehicle(G, boat);
    boat.speed = 8;
    G.shotAutoDrive = true;
    startMission(G, 1);
    stagePolice(G, 40, 120, -Math.PI / 2);
    trackCamera(G, 0, 9, 26, 0, -6);
  }
}
