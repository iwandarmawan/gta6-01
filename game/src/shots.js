// shots.js — Solmar Bay screenshot staging: ?shot=start|play|chase|mission
// (plus &seed=N) puts the game into a fixed, reproducible scene so the
// four screenshots are real renders of the game's own code: a hero
// boulevard cover, a combat standoff in the plaza, a police chase, and a
// timed delivery run. The staging runs after the world is built and
// before the first frame.
(function (global) {
  'use strict';

  // Put the player in a car at (x, z) facing heading, driving at speed.
  function putInCar(world, type, color, x, z, heading, speed) {
    const car = VP.makeCar(type, color, x, z, heading);
    car.speed = speed;
    world.scene.add(car.mesh);
    world.playerCars.push(car);
    world.player.inCar = car;
    world.player.mesh.visible = false;
    world.player.x = x;
    world.player.z = z;
    world.player.heading = heading;
    return car;
  }

  function putOnFoot(world, x, z, heading) {
    world.player.x = x;
    world.player.z = z;
    world.player.heading = heading;
    world.player.mesh.position.set(x, 0, z);
    world.player.mesh.rotation.y = heading;
    world.player.mesh.visible = true;
    world.player.inCar = null;
  }

  function stageShot(world, name) {
    const city = world.city;
    const plaza = city.plaza;
    world.state = 'playing';
    world.shotMode = true;
    world.camYaw = 0;
    world.camPitch = 0.32;
    if (name === 'start') {
      // Cover: a red coupe on the sun-soaked main avenue, downtown towers
      // and palms ahead, the plaza beacon glowing to the left. The car
      // sits close to the camera so it reads as the hero of the frame.
      putInCar(world, 'coupe', 0xc0392b, -52, 3, Math.PI / 2, 0);
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [-70, 9, 6],
        look: [-20, 2, -8],
      };
      world.mission.active = true;
      world.message = 'Delgado: "Take any car and bring it to the plaza marker."';
      world.messageT = 10;
    } else if (name === 'play') {
      // Combat: Rico on foot in the plaza, pistol raised and firing, a
      // thug going down ahead of him, a pedestrian running for cover.
      // The muzzle flash is frozen on so the shot reads in the frame.
      const ricoX = plaza.x + 8;
      const ricoZ = plaza.z + 12;
      const thugX = plaza.x + 5;
      const thugZ = plaza.z + 4;
      const heading = Math.atan2(thugX - ricoX, thugZ - ricoZ);
      putOnFoot(world, ricoX, ricoZ, heading);
      world.camYaw = heading;
      VP.grantPistol(world.combat, world.player);
      world.player.aimT = 99; // gun arm stays raised for the photo
      const thug = VP.makeThug(world.scene, thugX, thugZ);
      thug.heading = Math.atan2(ricoX - thugX, ricoZ - thugZ);
      thug.mesh.rotation.y = thug.heading;
      world.thugs.push(thug);
      // One shot at the thug: the flash fires, the tracer draws, and the
      // thug takes the hit (34 damage — still standing, aiming back).
      VP.attackPressed(world.combat, world);
      world.combat.flashT = 999; // freeze the flash on for the screenshot
      // A pedestrian near the plaza runs from the gunshot, in frame.
      const ped = world.pedestrians[0];
      ped.x = plaza.x - 6;
      ped.z = plaza.z + 2;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.fleeT = 99;
      ped.targetX = ped.x - 30;
      ped.targetZ = ped.z + 20;
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [ricoX + 5, 3.5, ricoZ + 7],
        look: [thugX, 1.4, thugZ],
      };
      world.mission.active = true;
      world.message = 'Delgado: "Take this. Things get loud from here."';
      world.messageT = 10;
    } else if (name === 'chase') {
      // Police chase: three wanted stars, two police cars right behind
      // the player's coupe, sirens flashing, avenue traffic ahead.
      // Both cruisers sit in the player's lane a few metres back, so the
      // chase camera (16 m behind) sees them framing the player's car.
      putInCar(world, 'coupe', 0x2e6db4, -30, 3, Math.PI / 2, 22);
      VP.addHeat(world.wanted, 70);
      const p1 = VP.makePoliceCar(world.scene, world.rng, city, -37, 1.5);
      p1.heading = Math.PI / 2;
      p1.speed = 21;
      const p2 = VP.makePoliceCar(world.scene, world.rng, city, -40, 5);
      p2.heading = Math.PI / 2;
      p2.speed = 20;
      world.police.push(p1);
      world.police.push(p2);
      world.cameraMode = 'follow';
      world.camYaw = Math.PI / 2;
      world.camPitch = 0.3;
      world.camDist = 16;
      world.autoDrive = true; // keep the chase rolling for the screenshot
      world.mission.active = true;
      world.message = 'WANTED — 3 stars! Lose the cops!';
      world.messageT = 10;
    } else if (name === 'mission') {
      // Clockwork: mission 3 in progress, the player's sedan racing the
      // 90-second clock toward the beach house, the countdown big on the
      // HUD and the beacon glowing over the sand ahead.
      VP.startMission(world.mission, 3, city);
      world.mission.timer = 72; // 01:12 left on the clock for the photo
      putInCar(world, 'sedan', 0x27ae60, 180, 96, Math.PI / 2, 9);
      // Camera on the road behind the car, looking east down the avenue:
      // the sedan, the beacon over the beach house and the sea ahead.
      world.cameraMode = 'fixed';
      world.camFixed = {
        pos: [148, 7, 96],
        look: [235, 1.5, 96],
      };
      world.autoDrive = true; // roll east toward the beach house
      world.message = 'Clockwork — 72 seconds to the beach house!';
      world.messageT = 10;
    } else {
      // Unknown shot name: just start playing at the plaza.
      putOnFoot(world, plaza.x + 8, plaza.z + 10, 0);
      world.cameraMode = 'follow';
    }
    // The beacon always marks the active mission target.
    VP.updateBeacon(world.beacon, world.mission.marker.x, world.mission.marker.z, 0);
  }

  global.VP = global.VP || {};
  global.VP.stageShot = stageShot;
})(typeof window !== 'undefined' ? window : globalThis);
