// Screenshot staging: each shot places the actors and sets the HUD, then the
// game renders the frame frozen — the game itself draws every pixel, nothing
// is faked. In shot mode the gameplay systems do not advance, so the staged
// frame is exactly the frame the screenshot takes.
const THREE = window.THREE;

import { POIS } from './config.js';

export const SHOT_NAMES = ['chase', 'play', 'drive', 'mission'];

function setPlayer(G, x, z, heading, speed) {
  const p = G.player;
  p.pos.set(x, 0, z);
  p.heading = heading;
  p.speed = speed;
}

function setObjective(G, missionIndex, stage, timeLeft) {
  G.missions.index = missionIndex;
  G.missions.stage = stage;
  G.missions.active = true;
  G.missions.fareMode = false;
  G.missions.timeLeft = timeLeft || 0;
  const st = G.missions.stageDef();
  G.missions.beacon.visible = true;
  G.missions.beacon.position.set(st.x, 30, st.z);
}

export function stageShot(name, G) {
  const p = G.player;
  G.shotMode = true;
  // No toast in a staged frame: the constructor's mission intro is not this shot's.
  G.hud.toastTtl = 0;
  G.hud.toastEl.style.opacity = 0;
  p.wanted = 0;
  p.health = 100;
  G.police.setWanted(0, p.pos.x, p.pos.z);

  if (name === 'chase') {
    // COVER: a four-star sunset chase on the beach, helicopter overhead. The
    // beach is the open sightline — the city row east of the coast road would
    // fill the frame from the road itself.
    p.onFoot = false;
    p.vehicleKind = 'sedan';
    p.vehicle = G.shotSedan;
    setPlayer(G, -152, 55, Math.PI, 22);
    p.vehicle.group.position.set(-152, 0, 55);
    p.vehicle.group.rotation.y = Math.PI;
    p.wanted = 4;
    G.police.setWanted(4, -152, 55);
    const spots = [
      [-150, 70, Math.PI],
      [-154, 80, Math.PI],
      [-148, 44, Math.PI],
      [-146, 28, Math.PI],
    ];
    G.police.units.forEach((u, i) => {
      const s = spots[i % spots.length];
      u.v.group.position.set(s[0], 0, s[1]);
      u.heading = s[2];
      u.v.group.rotation.y = s[2];
      u.speed = 20;
    });
    if (G.police.heli) G.police.heli.group.position.set(-142, 26, 70);
    // Two pedestrians on the beach, watching the chase go by.
    const beach = G.peds.list.slice(0, 2);
    beach[0].x = -158; beach[0].z = 40; beach[0].axis = 'x'; beach[0].dir = 1;
    beach[1].x = -160; beach[1].z = 16; beach[1].axis = 'x'; beach[1].dir = -1;
    for (const b of beach) b.group.position.set(b.x, 0, b.z);
    // A traffic car ahead on the beach.
    const t = G.traffic.cars[0];
    t.axis = 'x'; t.x = -152; t.z = 22; t.dir = -1;
    t.v.group.position.set(-152, 0, 22);
    t.v.group.rotation.y = Math.PI;
    setObjective(G, 1, 1, 0);
    G.cameraOverride = {
      pos: new THREE.Vector3(-160, 7, 95),
      look: new THREE.Vector3(-150, 1, -30),
    };
  } else if (name === 'play') {
    // On foot at Palm Plaza at dusk, the red sedan waiting under its beacon.
    p.onFoot = true;
    p.vehicle = null;
    p.vehicleKind = null;
    setPlayer(G, 2, 14, Math.PI, 0);
    setObjective(G, 0, 0, 0);
    // Side-on, so the plaza palm at (0, 13) does not stand between the
    // camera and the sedan.
    G.cameraOverride = {
      pos: new THREE.Vector3(14, 4.5, 20),
      look: new THREE.Vector3(-2, 1, 8),
    };
  } else if (name === 'drive') {
    // Driving the orange pickup down the sunset beach toward the lighthouse.
    p.onFoot = false;
    p.vehicleKind = 'pickup';
    p.vehicle = G.shotPickup;
    setPlayer(G, -152, 35, Math.PI, 20);
    p.vehicle.group.position.set(-152, 0, 35);
    p.vehicle.group.rotation.y = Math.PI;
    const t = G.traffic.cars[0];
    t.axis = 'x'; t.x = -152; t.z = 2; t.dir = -1;
    t.v.group.position.set(-152, 0, 2);
    t.v.group.rotation.y = Math.PI;
    setObjective(G, 2, 0, 90);
    G.cameraOverride = {
      pos: new THREE.Vector3(-157, 4, 52),
      look: new THREE.Vector3(-151, 1, 10),
    };
  } else if (name === 'mission') {
    // The skiff at the marina dock, shot from the land side so the MARINA
    // sign (which faces the city) reads, the docks lead the eye, and the
    // skiff sits in the water between them with the sunset sea behind. The
    // moored skiff is moved to the far dock so the two boats never overlap.
    p.onFoot = false;
    p.vehicleKind = 'skiff';
    p.vehicle = G.shotSkiff;
    G.marinaSkiff.group.position.set(-182, -0.2, 162);
    G.marinaSkiff.group.rotation.y = Math.PI / 2;
    setPlayer(G, -168, 145, Math.PI / 2, 11);
    p.vehicle.group.position.set(-168, -0.2, 145);
    p.vehicle.group.rotation.y = Math.PI / 2;
    p.wanted = 2;
    G.police.setWanted(2, -168, 145);
    G.police.units.forEach((u, i) => {
      u.v.group.position.set(-146 + i * 4, 0, 128 + i * 6);
      u.heading = Math.PI;
      u.v.group.rotation.y = Math.PI;
    });
    setObjective(G, 1, 1, 0);
    // The beach palm at (-141, 156) sits behind-right of this camera, out
    // of frame; the sightline runs clear over the low docks to the skiff.
    // Aimed a touch south so the MARINA sign sits inside the frame.
    G.cameraOverride = {
      pos: new THREE.Vector3(-146, 5, 162),
      look: new THREE.Vector3(-164, 0, 138),
    };
  }

  // The player mesh follows the staged position.
  G.playerMesh.position.set(p.pos.x, 0, p.pos.z);
  G.playerMesh.rotation.y = p.heading;
  G.playerMesh.visible = p.onFoot;
  if (p.vehicle) p.vehicle.group.visible = true;
}
