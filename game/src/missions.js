// Solmar Bay — the mission arc: five jobs from fixer Delgado, M1–M4
// playable, M5 locked until the first four are done. Each mission has a
// briefing, a waypoint beacon with a minimap blip, an objective line, and
// a cash reward. Missions are started in order from the pause menu or
// automatically when the previous one is finished.

import { MISSIONS, PLACES, TUNE, clamp, dist2 } from './config.js';

const T = window.THREE;

export class Missions {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.current = null; // active mission def, or null
    this.phase = 'idle'; // idle | active | done | failed
    this.timer = 0; // M3 countdown
    this.marker = null; // {x, z} current waypoint
    this.stage = 0; // multi-stage missions: 0 = first leg, 1 = second leg
    this.done = []; // completed mission ids
    this.bestDone = 0;
    // Waypoint beacon: a glowing gold cylinder + a floating diamond.
    this.beacon = new T.Group();
    const pole = new T.Mesh(
      new T.CylinderGeometry(0.5, 0.9, 26, 10, 1, true),
      new T.MeshBasicMaterial({ color: 0xffc832, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }),
    );
    pole.position.y = 13;
    this.beacon.add(pole);
    const diamond = new T.Mesh(
      new T.OctahedronGeometry(1.1),
      new T.MeshBasicMaterial({ color: 0xffd832 }),
    );
    diamond.position.y = 4.5;
    this.beacon.add(diamond);
    this.diamond = diamond;
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    this.beaconTimer = 0;
  }

  // Start a mission by id (1-4 playable; 5 is locked until 1-4 are done).
  start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (id === 5 && !(this.done.includes(1) && this.done.includes(2) && this.done.includes(3) && this.done.includes(4))) {
      this.game.say('M5 "The Big One" is locked — finish missions 1–4 first.');
      return false;
    }
    this.current = def;
    this.phase = 'active';
    this.stage = 0;
    this.timer = def.id === 3 ? TUNE.missionTimeM3 : 0;
    this.setMarkerFor(def.id, 0);
    this.game.say(def.briefing);
    this.game.audio.click();
    return true;
  }

  // Where the beacon goes for a mission at a given stage.
  setMarkerFor(id, stage) {
    let at = PLACES.plaza;
    if (id === 1) at = PLACES.plaza;
    else if (id === 2) at = stage === 0 ? PLACES.docks : PLACES.safehouse;
    else if (id === 3) at = PLACES.delivery;
    else if (id === 4) at = stage === 0 ? PLACES.park : PLACES.safehouse;
    else at = PLACES.plaza;
    this.marker = { x: at.x, z: at.z };
    this.beacon.position.set(at.x, 0, at.z);
    this.beacon.visible = true;
  }

  // The player reached the beacon (on foot within 4 m, or in a car within 6 m).
  reachedMarker() {
    if (!this.current || this.phase !== 'active' || !this.marker) return false;
    const g = this.game;
    const radius = g.player.inCar ? 6.5 : 4;
    return dist2(g.player.x, g.player.z, this.marker.x, this.marker.z) < radius;
  }

  complete() {
    const g = this.game;
    const def = this.current;
    g.cash += def.reward;
    this.done.push(def.id);
    this.bestDone = Math.max(this.bestDone, def.id);
    this.phase = 'done';
    this.current = null;
    this.beacon.visible = false;
    this.marker = null;
    g.say(`Job done: ${def.name} — +$${def.reward}.`);
    g.audio.sting();
    g.save();
    // Offer the next job straight away.
    const next = def.id + 1;
    if (next <= 4) {
      window.setTimeout(() => {
        if (this.phase === 'done') this.start(next);
      }, 2500);
    }
  }

  fail(reason) {
    const g = this.game;
    this.phase = 'failed';
    this.current = null;
    this.beacon.visible = false;
    this.marker = null;
    // A failed ambush leaves no thugs standing around the park.
    g.combat.clearThugs();
    g.say(`Job failed: ${reason} — talk to Delgado to retry.`);
    g.audio.fail();
    window.setTimeout(() => { if (this.phase === 'failed') this.phase = 'idle'; }, 2000);
  }

  update(dt) {
    const g = this.game;
    if (this.beacon.visible) {
      this.beaconTimer += dt;
      this.diamond.rotation.y += dt * 2;
      this.diamond.position.y = 4.5 + Math.sin(this.beaconTimer * 2.5) * 0.5;
    }
    if (!this.current || this.phase !== 'active') return;
    const id = this.current.id;

    // M3: the clock runs down; hitting zero fails the job.
    if (id === 3) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.fail('Out of time on Clockwork.');
        return;
      }
    }

    // M4 ambush (stage 1): no marker while fighting — the job advances
    // when the last thug falls, then the escape marker appears.
    if (id === 4 && this.stage === 1) {
      const alive = g.combat.thugs.some((t) => !t.dead);
      if (!alive && g.combat.thugs.length > 0) {
        this.stage = 2;
        this.setMarkerFor(4, 1);
        g.police.addWanted(3);
        g.say('Ambush cleared — escape to the safehouse at 3 stars!');
        g.audio.sting();
      }
      return;
    }

    if (!this.reachedMarker()) return;

    if (id === 1) {
      // M1 needs the player to arrive in a car.
      if (g.player.inCar) this.complete();
      else g.say('Get in a car and drive into the marker.');
    } else if (id === 2) {
      if (this.stage === 0) {
        // Picked up the package: the heat is on, head for the safehouse.
        this.stage = 1;
        this.setMarkerFor(2, 1);
        g.police.addWanted(2);
        g.say('Package grabbed — reach the safehouse, lose the heat!');
        g.audio.sting();
      } else {
        this.complete();
      }
    } else if (id === 3) {
      this.complete();
    } else if (id === 4) {
      if (this.stage === 0) {
        if (g.player.inCar) {
          g.say('On foot, Rico — leave the car and walk into the park.');
          return;
        }
        // The ambush: three thugs step out with pistols.
        this.stage = 1;
        this.beacon.visible = false;
        this.marker = null;
        g.combat.spawnThugs(PLACES.park.x, PLACES.park.z, 3);
        g.police.addWanted(1);
        g.say('It is a setup! Take down the three thugs!');
        g.audio.fail();
      } else if (this.stage === 2) {
        this.complete();
      }
    }
  }

  // Objective line for the HUD.
  objectiveText() {
    if (this.current && this.phase === 'active') {
      const def = this.current;
      if (def.id === 2 && this.stage === 1) return 'JOB 2: The Getaway — reach the safehouse';
      if (def.id === 4 && this.stage === 1) return 'JOB 4: The Informant — survive the ambush';
      if (def.id === 4 && this.stage === 2) return 'JOB 4: The Informant — escape to the safehouse';
      return `JOB ${def.id}: ${def.name} — ${def.objective}`;
    }
    if (this.done.length >= 4) return 'All jobs done — talk to Delgado for the Big One';
    return 'No active job — open the pause menu (P) to start a mission';
  }
}
