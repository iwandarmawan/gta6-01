// Solmar Bay — screenshot scenes behind ?shot=start|play|chase|mission.
// Each scene stages a real game state (real mission, real wanted level,
// real cars and police) and freezes it, so the frame is what the game
// actually looks like and the same seed always gives the same frame.

import { PLACES } from './config.js';

// Put the player in a car at (x, z) facing `heading`, engine running.
function stageInCar(game, x, z, heading, speed = 0) {
  const car = game.parked[0];
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = speed;
  car.group.position.set(x, 0, z);
  car.group.rotation.y = heading;
  game.player.inCar = true;
  game.player.car = car;
  game.player.x = x;
  game.player.z = z;
  game.player.heading = heading;
  game.playerMesh.visible = false;
  game.renderer.snap(game.player);
}

export function stageShot(game, name) {
  game.state = 'playing';
  game.hud.hideTitle();
  game.audio.setMuted(true); // screenshots never need sound
  // Each scene shows a different time of day on the HUD clock.
  const sceneTimes = { start: 120, play: 480, chase: 900, mission: 360 };
  game.time = sceneTimes[name] ?? 120;

  if (name === 'play') {
    // On foot in the plaza, pistol out, one star, two peds fleeing, M4 live.
    game.debugTeleport(PLACES.plaza.x - 6, PLACES.plaza.z + 10, Math.PI * 0.9);
    game.combat.setWeapon('pistol');
    game.combat.mag = 9;
    game.combat.reserve = 48;
    game.debugSetWanted(1);
    game.debugStartMission(4);
    game.peds.scare(game.player.x, game.player.z, 18);
    // Two peds right in front of the player (forward is mostly -z here),
    // mid-flee from the gunfire.
    const p1 = game.peds.peds[0];
    const p2 = game.peds.peds[1];
    p1.x = game.player.x + 4; p1.z = game.player.z - 8; p1.fleeing = 3;
    p2.x = game.player.x - 5; p2.z = game.player.z - 10; p2.fleeing = 3;
    game.peds.update(0.1);
    game.renderer.snap(game.player);
    game.hud.update(0.1);
    return;
  }

  if (name === 'chase') {
    // Police chase: 3 stars, two police cars right behind, M2 live.
    stageInCar(game, 0, 120, Math.PI, 22);
    game.debugSetWanted(3);
    game.debugStartMission(2);
    game.missions.stage = 1;
    game.missions.setMarkerFor(2, 1);
    game.police.update(0.5);
    // Pull two police cars in close for the shot, flanking ahead of the
    // player where the chase camera can see them (cops right behind the
    // player fall behind the camera and vanish from the frame).
    const cops = game.police.cars;
    if (cops[0]) {
      cops[0].x = game.player.x - 6; cops[0].z = game.player.z - 14;
      cops[0].heading = game.player.heading;
      cops[0].group.position.set(cops[0].x, 0, cops[0].z);
    }
    if (cops[1]) {
      cops[1].x = game.player.x + 7; cops[1].z = game.player.z - 18;
      cops[1].heading = game.player.heading;
      cops[1].group.position.set(cops[1].x, 0, cops[1].z);
    }
    game.renderer.snap(game.player);
    game.hud.update(0.1);
    return;
  }

  if (name === 'mission') {
    // M3 Clockwork mid-delivery: countdown at 1:12, car mid-turn, 79 km/h.
    stageInCar(game, 108, 108, Math.PI * 0.75, 22);
    game.debugStartMission(3);
    game.missions.timer = 72; // 1:12 on the clock
    game.renderer.snap(game.player);
    game.hud.update(0.1);
    return;
  }

  // Default (start): the cover — red sedan on the central avenue, M1 live.
  stageInCar(game, 0, 162, Math.PI, 0);
  game.debugStartMission(1);
  game.renderer.snap(game.player);
  game.hud.update(0.1);
}
