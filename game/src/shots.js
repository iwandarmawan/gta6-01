// Screenshot mode: the ?shot= query the shots.json list uses.
// Each shot sets up one composed scene (start screen, driving,
// a police chase, a mission in progress) so the screenshots the
// entry ships are real renders of the game itself.

import { PLACES } from './config.js';
import { makeCar } from './cars.js';

export function applyShot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = Number(params.get('seed') || 1);
  void seed;

  // Bright midday light for every shot: the city reads best in sun.
  game.timeOfDay = 0.58;
  game.timeFrozen = true;
  game.snapCamera = true;

  if (shot === 'start') {
    // Menu state with the orbiting camera: nothing else to do.
    return 'start';
  }

  game.hideStartScreen();
  game.mode = 'playing';

  if (shot === 'play') {
    const car = game.playerCar;
    car.pos.set(-100, 0, 30);
    car.heading = Math.PI / 2;
    car.speed = 16;
    game.shotDrive = true;
    game.enterCar(car);
    game.rig.yaw = Math.PI / 2;
    game.rig.dist = 11;
    return 'play';
  }

  if (shot === 'chase') {
    const car = game.playerCar;
    car.pos.set(0, 0, 30);
    car.heading = Math.PI / 2;
    car.speed = 20;
    game.shotDrive = true;
    game.enterCar(car);
    game.rig.yaw = Math.PI / 2;
    game.rig.dist = 12;
    // Three stars, and three cruisers staged where the camera sees them.
    game.police.heat = 60;
    game.police.stars = 3;
    const spots = [
      { x: 55, z: 30, heading: -Math.PI / 2 },
      { x: 72, z: 37, heading: -Math.PI / 2 },
      { x: -35, z: 30, heading: Math.PI / 2 },
    ];
    for (const s of spots) {
      const cruiser = makeCar(game.env.scene, s.x, s.z, s.heading, 0xe8e8e8, true);
      game.police.cars.push({ car: cruiser, ramCooldown: 0, sirenPhase: 0 });
    }
    game.hud.toast('WANTED — 3 stars', 3);
    return 'chase';
  }

  if (shot === 'mission') {
    game.missions.index = 1;
    game.missions.startNext();
    game.player.pos.set(-152, 0, -78);
    game.player.heading = Math.atan2(
      PLACES.packages[0].x - game.player.pos.x,
      PLACES.packages[0].z - game.player.pos.z,
    );
    game.player.group.position.copy(game.player.pos);
    game.player.group.rotation.y = game.player.heading;
    game.rig.yaw = game.player.heading;
    game.police.addHeat(20);
    return 'mission';
  }

  if (shot === 'end') {
    game.mode = 'over';
    game.hud.showGameOver('wasted', () => {}, () => {});
    return 'end';
  }

  return shot;
}
