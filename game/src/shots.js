// The screenshot scenes behind ?shot=start|play|chase|mission. Each one
// poses the real game state at a fixed, seeded moment — a real car on a
// real avenue, a real pistol with a real muzzle flash, a real 3-star chase
// — and the renderer paints it, so the frame is what playing the game
// really looks like and the same seed always gives the same frame.
import { createPlayerCar } from './cars.js';
import { startMission } from './missions.js';
import { forcePoliceCar } from './police.js';

/** Put Rico's on-foot mesh where the state says he stands. */
function syncPlayerMesh(G) {
  const p = G.player;
  G.playerMesh.visible = !G.inCar;
  G.playerMesh.position.set(p.x, p.y || 0, p.z);
  G.playerMesh.rotation.y = -p.angle + Math.PI / 2;
}

export function stageShot(name, G) {
  G.mode = 'play';
  G.hud.showPanel(null);
  G.player.health = 100;
  if (name === 'play') return stagePlay(G);
  if (name === 'chase') return stageChase(G);
  if (name === 'mission') return stageMission(G);
  return stageStart(G);
}

function stageStart(G) {
  // Cover: Rico's red sedan on the sun-soaked central avenue, skyline and
  // palms ahead, the plaza marker in the distance, full HUD and minimap.
  // The car sits on the road west of the plaza (clear of the lamp posts),
  // and the camera rides higher so the asphalt does not eat the frame.
  const car = createPlayerCar(G.scene, -64, -48, 0, 0xd84a4a, 'sedan');
  G.car = car;
  G.inCar = true;
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.angle = car.angle;
  G.shotCam = { dist: 16, height: 7 };
  G.wanted = 0;
  G.cash = 250;
  startMission(G, 1);
  G.mission.stage = 'drive';
  G.hud.objective('Drive to the plaza marker');
  syncPlayerMesh(G);
  G.hud.update(G, 1 / 60);
}

function stagePlay(G) {
  // Combat in the plaza: Rico on foot, pistol drawn, a fresh muzzle flash,
  // a pedestrian fleeing, traffic passing, the marker down the avenue.
  G.player.x = G.city.plaza.x + 8;
  G.player.z = G.city.plaza.z + 10;
  G.player.angle = Math.PI / 2;
  G.inCar = false;
  G.combat.weapon = 'pistol';
  G.combat.mag = 9;
  G.wanted = 1;
  G.cash = 300;
  startMission(G, 4);
  G.mission.stage = 'meet';
  G.hud.objective('Meet the informant in the park — on foot');
  // Two pedestrians right in front of Rico, already running for it.
  const ped = G.peds.peds[0];
  ped.x = G.player.x + 2;
  ped.z = G.player.z + 5;
  ped.fleeing = 5;
  ped.target = { x: ped.x + 26, z: ped.z + 18 };
  ped.mesh.position.set(ped.x, 0, ped.z);
  ped.mesh.rotation.y = -Math.PI / 4;
  const ped2 = G.peds.peds[1];
  ped2.x = G.player.x - 3;
  ped2.z = G.player.z + 7;
  ped2.fleeing = 5;
  ped2.target = { x: ped2.x - 20, z: ped2.z + 24 };
  ped2.mesh.position.set(ped2.x, 0, ped2.z);
  ped2.mesh.rotation.y = Math.PI / 3;
  // One shot fired a blink ago, so the muzzle flash is lit in the frame:
  // at the gun, just ahead of Rico's right hand.
  G.combat.flashTimer = 0.07;
  G.combat.flash.visible = true;
  G.combat.flash.position.set(G.player.x - 0.3, 1.4, G.player.z + 0.9);
  G.combat.flashLight.position.copy(G.combat.flash.position);
  G.combat.flashLight.intensity = 6;
  // The pistol itself: the game loop normally puts it in Rico's hand, but
  // the screenshot pose paints without stepping, so pose it here too.
  const a = G.player.angle;
  G.combat.pistol.visible = true;
  G.combat.pistol.position.set(
    G.player.x + Math.cos(a) * 0.45 - Math.sin(a) * 0.3,
    1.25,
    G.player.z + Math.sin(a) * 0.45 + Math.cos(a) * 0.3,
  );
  G.combat.pistol.rotation.y = -a;
  syncPlayerMesh(G);
  G.hud.update(G, 1 / 60);
}

function stageChase(G) {
  // Three stars, two police cars closing in behind Rico's blue sedan,
  // light bars flashing, the siren on. The camera rides high and far so
  // the pursuit reads: the cops sit just behind Rico, one to each side.
  const car = createPlayerCar(G.scene, 0, -48, 0, 0x4a7fd8, 'sedan');
  G.car = car;
  G.inCar = true;
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.angle = car.angle;
  car.speed = 26;
  G.shotCam = { dist: 24, height: 10 };
  G.wanted = 3;
  G.cash = 550;
  startMission(G, 2);
  G.mission.stage = 'escape';
  G.hud.objective('Package grabbed — reach the safehouse, lose the heat!');
  const cop1 = forcePoliceCar(G, G.scene, -10, -40, 0);
  const cop2 = forcePoliceCar(G, G.scene, -10, -56, 0.1);
  cop1.speed = 30;
  cop2.speed = 28;
  cop1.mesh.userData.lightRed.visible = true;
  cop2.mesh.userData.lightBlue.visible = true;
  syncPlayerMesh(G);
  G.hud.update(G, 1 / 60);
}

function stageMission(G) {
  // Mission 3 mid-delivery: 72 seconds left on the HUD countdown, the
  // waypoint beam ahead, Rico's yellow hatchback mid-turn toward it.
  const car = createPlayerCar(G.scene, -120, 48, -Math.PI / 4, 0xf2c94c, 'hatch');
  G.car = car;
  G.inCar = true;
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.angle = car.angle;
  car.speed = 22;
  G.wanted = 0;
  G.cash = 300;
  startMission(G, 3);
  G.mission.timer = 72;
  G.hud.objective('Deliver across the city — 90 seconds!');
  syncPlayerMesh(G);
  G.hud.update(G, 1 / 60);
}
