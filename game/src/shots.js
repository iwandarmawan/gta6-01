// shots.js — scripted screenshot staging for seed=4. The game renders these
// states through its own code; nothing is faked. Rules learned from rounds
// 12–13: in shot mode dt is frozen at 0, the menu is hidden, missions are set
// to phase 'done' so updateMissions never overwrites the staged objective,
// and the chase camera / heli updates are skipped so staged positions survive.
import THREE from './three-shim.js';

export function shotName() {
  try { return new URLSearchParams(location.search).get('shot'); }
  catch (e) { return null; }
}

function setCam(G, px, py, pz, lx, ly, lz) {
  G.shotCamera = { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) };
  G.camera.position.copy(G.shotCamera.pos);
  G.camera.lookAt(G.shotCamera.look);
}

export function stageShot(G, name) {
  G.shotMode = true;
  G.missions.phase = 'done'; // freeze the mission system on the staged text
  document.getElementById('menu').style.display = 'none';
  const spots = G.spots;

  if (name === 'chase') {
    // Storm chase on the coast road, lighthouse ahead, heli spotlight in rain.
    G.mode = 'drive';
    G.vehicle = G.vehicles.sedan;
    G.player.group.visible = false;
    const sedan = G.vehicles.sedan;
    sedan.group.visible = true;
    sedan.group.position.set(140, 0, -60);
    sedan.heading = 0.56; sedan.speed = 21.4; // 77 km/h
    sedan.group.rotation.y = sedan.heading;
    const p1 = G.police.cars[0].v, p2 = G.police.cars[1].v;
    p1.group.visible = true; p2.group.visible = true;
    p1.group.position.set(148, 0, -18); p1.heading = 0.5; p1.group.rotation.y = 0.5;
    p2.group.position.set(146, 0, 4); p2.heading = 0.6; p2.group.rotation.y = 0.6;
    G.police.heli.position.set(152, 16, -48);
    G.police.heli.rotation.y = 0.9;
    G.wanted = 4;
    G.missions.objective = 'Reach the lighthouse point';
    G.hud.setObjective('Reach the lighthouse point');
    G.beacon.position.set(spots.lighthouse.x, 0, spots.lighthouse.z);
    G.beacon.visible = true;
    G.playerPos = { x: 140, z: -60 };
    setCam(G, 148, 12, -85, 150, 2, -40);
  } else if (name === 'play') {
    // On foot at Palm Plaza in the rain, red sedan under the beacon.
    G.mode = 'foot';
    G.vehicle = null;
    G.player.group.visible = true;
    G.player.group.position.set(-24, 0, 10);
    G.player.heading = 0.9;
    G.player.group.rotation.y = 0.9;
    const sedan = G.vehicles.sedan;
    sedan.group.visible = true;
    sedan.group.position.set(-12, 0, 2);
    sedan.heading = 2.2; sedan.group.rotation.y = 2.2;
    G.wanted = 0;
    G.missions.objective = 'Steal a car (walk up and press E)';
    G.hud.setObjective('Steal a car (walk up and press E)');
    G.beacon.position.set(-12, 0, 2);
    G.beacon.visible = true;
    G.playerPos = { x: -24, z: 10 };
    setCam(G, -34, 8, 26, -12, 1.5, 0);
  } else if (name === 'drive') {
    // Orange pickup up the rain-slicked coast road, traffic ahead, taxi timer.
    G.mode = 'drive';
    G.vehicle = G.vehicles.pickup;
    G.player.group.visible = false;
    const pk = G.vehicles.pickup;
    pk.group.visible = true;
    pk.group.position.set(140, 0, 62);
    pk.heading = Math.PI; pk.speed = 19.4; // 70 km/h
    pk.group.rotation.y = Math.PI;
    const t0 = G.traffic.cars[0].v;
    t0.group.position.set(140, 0, 18); t0.heading = Math.PI; t0.group.rotation.y = Math.PI;
    G.wanted = 0;
    G.missions.objective = 'Pick up the fare at Palm Plaza';
    G.missions.timer = 90;
    G.hud.setObjective('Pick up the fare at Palm Plaza');
    G.beacon.position.set(spots.plaza.x, 0, spots.plaza.z);
    G.beacon.visible = true;
    G.playerPos = { x: 140, z: 62 };
    setCam(G, 147, 7, 86, 140, 2, 20);
  } else {
    // Mission: skiff in open storm water heading for the lighthouse.
    G.mode = 'drive';
    G.vehicle = G.vehicles.skiff;
    G.player.group.visible = false;
    const sk = G.vehicles.skiff;
    sk.group.visible = true;
    sk.group.position.set(166, 0.1, 62);
    sk.heading = 2.93; sk.speed = 10.5; // 38 km/h
    sk.group.rotation.y = 2.93;
    G.wanted = 2;
    G.missions.objective = 'Reach the lighthouse point';
    G.hud.setObjective('Reach the lighthouse point');
    G.beacon.position.set(spots.lighthouse.x, 0, spots.lighthouse.z);
    G.beacon.visible = true;
    G.playerPos = { x: 166, z: 62 };
    setCam(G, 178, 5, 84, 168, 1, 45);
  }
  G.hud.update(G, 0);
  document.getElementById('status').textContent = 'ready';
}
