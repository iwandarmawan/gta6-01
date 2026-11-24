// Staged screenshots: the game reads ?shot=<name>&seed=<n> from the URL
// and places everything for one picture — the player, the cars, the
// police, the mission and the camera — then plays on from there. The
// pictures are real renders of the game's own code, never composited.
// Four shots: chase (the cover), play, drive and mission.
import { makeVehicle } from './cars.js';
import { startMission } from './missions.js';

// One staged scene: where the player is, what they drive, the wanted
// level, the mission, and the camera pose that frames it.
const SHOTS = {
  chase: {
    // A police chase up the beach: two interceptors behind the sedan, three
    // stars, the lighthouse and its beacon dead ahead, the sea on the right
    // and the seafront buildings on the left. The beach is the one stretch
    // of coast with a clear sightline — the road itself is a canyon between
    // the west blocks and the narrow east row at x = 152-158, so the chase
    // runs on the sand, where a GTA chase belongs.
    vehicle: { kind: 'sedan', x: 170, z: 10, heading: 0 },
    wanted: 3, mission: 'harbour', missionStep: 1,
    police: [
      { x: 167, z: 28, heading: 0 },
      { x: 173, z: 37, heading: 0 },
    ],
    traffic: { x: 178, z: -30, heading: 0 },
    peds: [{ x: 164, z: -8 }, { x: 175, z: 18 }],
    speed: 22,
    camera: { x: 176, y: 8, z: 55, tx: 171, ty: 2, tz: -15 },
  },
  play: {
    // On foot at Palm Plaza: Rico by the fountain, the beacon over the car
    // to steal, the mission banner up, pedestrians crossing.
    onFoot: { x: 60, z: 44, heading: Math.PI },
    wanted: 0, mission: 'wheels', missionStep: 0,
    targetCar: { kind: 'sedan', x: 60, z: 32, heading: Math.PI / 2 },
    camera: { x: 60, y: 7, z: 58, tx: 60, ty: 2, tz: 30 },
  },
  drive: {
    // Driving the pickup up the beach toward the lighthouse: the lighthouse
    // and its beacon big ahead, the sea on the right, the seafront on the
    // left, a fare on the clock. Same beach as the cover, a different
    // stretch — the lighthouse is close here, not a distant needle. The
    // camera stands clear of the cross street at z = -60, so no black
    // road band crosses the bottom of the frame.
    vehicle: { kind: 'pickup', x: 170, z: -100, heading: 0 },
    wanted: 0, mission: 'taxi', missionStep: 0,
    traffic: { x: 177, z: -125, heading: 0 },
    speed: 20,
    camera: { x: 172, y: 9, z: -68, tx: 169, ty: 2, tz: -115 },
  },
  mission: {
    // The skiff at the marina: docks, beach and city behind, the lighthouse
    // and its beacon ahead, two stars on the HUD.
    vehicle: { kind: 'boat', x: 205, z: 70, heading: Math.PI },
    wanted: 2, mission: 'harbour', missionStep: 1,
    speed: 11,
    camera: { x: 218, y: 5, z: 84, tx: 205, ty: 1, tz: 64 },
  },
};

// Stage one shot, or return null when the URL names none.
export function stageShot(G) {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name || !SHOTS[name]) return null;
  const shot = SHOTS[name];
  G.shotMode = true;
  G.shotPose = shot.camera;
  // The mission the shot shows: jump the story straight to its step.
  if (shot.mission) {
    const idx = ['wheels', 'harbour', 'taxi', 'courier', 'leap', 'cache'].indexOf(shot.mission);
    G.missions.index = idx;
    startMission(G);
    G.missions.step = shot.missionStep;
    const step = G.missions.active.steps[G.missions.step];
    G.hud.setObjective(step.text, G.missions.timer > 0 ? G.missions.timer : 0);
    G.missions.beacon.position.set(step.target.x, 30, step.target.z);
    G.missions.marker.position.set(step.target.x, 0.2, step.target.z);
  }
  if (shot.vehicle) {
    const v = makeVehicle(G.scene, shot.vehicle.kind, shot.vehicle.x, shot.vehicle.z, shot.vehicle.heading);
    v.speed = shot.speed || 0;
    G.vehicle = v;
    G.player.inVehicle = true;
    G.player.x = v.x; G.player.z = v.z; G.player.heading = v.heading; G.player.speed = v.speed;
  }
  if (shot.onFoot) {
    G.player.x = shot.onFoot.x; G.player.z = shot.onFoot.z;
    G.player.heading = shot.onFoot.heading;
  }
  if (shot.targetCar) {
    makeVehicle(G.scene, shot.targetCar.kind, shot.targetCar.x, shot.targetCar.z, shot.targetCar.heading);
  }
  if (shot.traffic) {
    const t = G.traffic[0];
    t.x = shot.traffic.x; t.z = shot.traffic.z; t.heading = shot.traffic.heading;
    t.mesh.position.set(t.x, 0, t.z);
    t.mesh.rotation.y = t.heading;
  }
  if (shot.police) {
    for (const p of shot.police) {
      const car = makeVehicle(G.scene, 'police', p.x, p.z, p.heading);
      car.speed = 20;
      G.police.cars.push(car);
    }
  }
  // Pedestrians placed in the frame, so the shot reads as a lived-in city.
  if (shot.peds) {
    shot.peds.forEach((spot, i) => {
      const ped = G.peds[i % G.peds.length];
      ped.x = spot.x; ped.z = spot.z;
      ped.mesh.position.set(spot.x, 0, spot.z);
      ped.mesh.rotation.y = Math.PI;
    });
  }
  G.wanted = shot.wanted;
  G.hud.setWanted(G.wanted);
  G.hud.setCash(G.cash);
  // The shot is a frozen frame, so the HUD is set from the staged values,
  // not from a loop that never runs in shot mode.
  G.hud.setSpeed((shot.speed || 0) * 3.6);
  G.hud.setCompass(((-G.player.heading * 180) / Math.PI % 360 + 360) % 360);
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.player.mesh.rotation.y = G.player.heading;
  G.player.mesh.visible = !G.player.inVehicle;
  return name;
}
