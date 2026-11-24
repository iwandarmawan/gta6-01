// Missions and jobs: the six-job story arc for Rico Marlowe and Vera Costa,
// repeatable taxi fares, and Rico's Garage shop.
import { AIRFIELD, FARES, GARAGE, LIGHTHOUSE, MARINA, MISSIONS, PLAZA, RAMP } from './config.js';
import { addWanted } from './police.js';

// The beacon marks the mission target on the ground and the minimap.
export function setBeacon(G, x, z) {
  G.beacon = { x, z };
  if (!G.beaconMesh) {
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 60, 10, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    G.beaconMesh = new THREE.Mesh(geo, mat);
    G.scene.add(G.beaconMesh);
  }
  G.beaconMesh.position.set(x, 30, z);
  G.beaconMesh.visible = true;
}

export function clearBeacon(G) {
  G.beacon = null;
  if (G.beaconMesh) G.beaconMesh.visible = false;
}

function startMission(G, index) {
  const def = MISSIONS[index];
  G.mission = { def, index, stage: 0, timer: def.time ?? 0, collected: 0, drops: [] };
  G.hud.banner(`${def.name} — $${def.pay}`, def.text);
  G.audio.blip(660, 0.15, 'triangle', 0.14);
  if (def.id === 'wheels') setBeacon(G, 60, 32);
  if (def.id === 'harbour') {
    setBeacon(G, LIGHTHOUSE[0], LIGHTHOUSE[1]);
    G.hud.objective('Board the skiff at the marina, then reach the lighthouse point');
  }
  if (def.id === 'taxi') setBeacon(G, PLAZA[0], PLAZA[1]);
  if (def.id === 'courier') {
    G.mission.drops = [[-60, -60], [90, 120], [-120, 30]];
    setBeacon(G, ...G.mission.drops[0]);
  }
  if (def.id === 'leap') setBeacon(G, RAMP[0], RAMP[1]);
  if (def.id === 'cache') {
    setBeacon(G, LIGHTHOUSE[0], LIGHTHOUSE[1]);
    spawnPackages(G);
  }
}

function spawnPackages(G) {
  G.packages = [];
  const mat = new THREE.MeshLambertMaterial({ color: 0xffd21f });
  for (let i = 0; i < 5; i++) {
    const pkg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat);
    const x = LIGHTHOUSE[0] - 12 + (i % 3) * 10;
    const z = LIGHTHOUSE[1] - 6 + Math.floor(i / 3) * 10;
    pkg.position.set(x, 0.8, z);
    G.scene.add(pkg);
    G.packages.push({ mesh: pkg, x, z, taken: false });
  }
}

function completeMission(G) {
  const { def } = G.mission;
  G.player.cash += def.pay;
  G.player.done.add(def.id);
  G.hud.banner(`${def.name} complete — +$${def.pay}`, 'Vera Costa sends her regards.');
  G.audio.missionDone();
  clearBeacon(G);
  if (G.packages) {
    for (const p of G.packages) G.scene.remove(p.mesh);
    G.packages = null;
  }
  G.mission = null;
  G.save();
}

function failMission(G, why) {
  G.hud.banner('Job failed', why);
  clearBeacon(G);
  if (G.packages) {
    for (const p of G.packages) G.scene.remove(p.mesh);
    G.packages = null;
  }
  G.mission = null;
}

// Start the next unstarted story job, or a taxi fare when the arc is done.
export function startNextJob(G) {
  if (G.mission) return;
  const next = MISSIONS.findIndex((m) => !G.player.done.has(m.id));
  if (next >= 0) {
    startMission(G, next);
    return;
  }
  const fare = FARES[Math.floor(Math.random() * FARES.length)];
  G.mission = { def: { id: 'fare', name: 'Taxi Fare', pay: fare.pay, text: fare.label }, index: -1, stage: 0, timer: 75, fare };
  setBeacon(G, ...fare.from);
  G.hud.banner(`Taxi Fare — $${fare.pay}`, fare.label);
}

// The garage shop: buy with cash, applied at once.
export function buyUpgrade(G, which) {
  const P = G.player;
  if (which === 'repair') {
    if (P.cash < GARAGE.repair.price) return G.hud.flash('Not enough cash for a repair');
    P.cash -= GARAGE.repair.price;
    P.hp = 100;
    if (P.vehicle) P.vehicle.hp = 100;
    G.hud.flash('Repaired — good as new');
  }
  if (which === 'engine') {
    if (P.upgrades.engine) return G.hud.flash('Engine already tuned');
    if (P.cash < GARAGE.engine.price) return G.hud.flash('Not enough cash for the engine tune');
    P.cash -= GARAGE.engine.price;
    P.upgrades.engine = true;
    G.hud.flash('Engine tuned — +25% top speed');
  }
  if (which === 'armor') {
    if (P.upgrades.armor) return G.hud.flash('Armor already fitted');
    if (P.cash < GARAGE.armor.price) return G.hud.flash('Not enough cash for armor');
    P.cash -= GARAGE.armor.price;
    P.upgrades.armor = true;
    P.hp = Math.min(150, P.hp + 50);
    G.hud.flash('Armor fitted — +50 HP');
  }
  G.audio.coin();
  G.save();
}

// One tick of the active mission. Checks arrivals, timers and pickups.
export function updateMission(G, dt) {
  const M = G.mission;
  if (!M) return;
  const P = G.player;
  if (M.timer > 0) {
    M.timer -= dt;
    if (M.timer <= 0) return failMission(G, 'Out of time');
  }
  const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
  const id = M.def.id;

  if (id === 'wheels' && M.stage === 0 && P.vehicle && P.vehicle.kind !== 'boat') {
    M.stage = 1;
    completeMission(G);
  }
  if (id === 'harbour' && M.stage === 0 && P.vehicle && P.vehicle.kind === 'boat') {
    M.stage = 1;
    addWanted(G, 2);
    G.hud.objective('Reach the lighthouse point — the PD is on you');
  }
  if (id === 'harbour' && M.stage === 1 && near(LIGHTHOUSE[0], LIGHTHOUSE[1], 14)) {
    completeMission(G);
  }
  if (id === 'taxi' && M.stage === 0 && near(PLAZA[0], PLAZA[1], 10)) {
    M.stage = 1;
    setBeacon(G, AIRFIELD[0], AIRFIELD[1]);
    G.hud.objective('Deliver the fare to the airfield');
  }
  if (id === 'taxi' && M.stage === 1 && near(AIRFIELD[0], AIRFIELD[1], 12)) {
    completeMission(G);
  }
  if (id === 'courier') {
    const drop = M.drops[M.stage];
    if (drop && near(drop[0], drop[1], 9)) {
      M.stage += 1;
      G.audio.coin();
      if (M.stage >= M.drops.length) return completeMission(G);
      setBeacon(G, ...M.drops[M.stage]);
      G.hud.objective(`Drop ${M.stage + 1} of 3`);
    }
  }
  if (id === 'leap' && M.stage === 0 && near(RAMP[0], RAMP[1], 10) && P.vehicle && Math.abs(P.vehicle.speed) > 20) {
    M.stage = 1;
    G.hud.objective('Airborne! Land past the gap');
    setTimeout(() => {
      if (G.mission && G.mission.def.id === 'leap') completeMission(G);
    }, 1500);
  }
  if (id === 'cache' && G.packages) {
    for (const pkg of G.packages) {
      if (!pkg.taken && near(pkg.x, pkg.z, 4)) {
        pkg.taken = true;
        G.scene.remove(pkg.mesh);
        M.collected += 1;
        G.audio.coin();
        G.hud.objective(`Packages: ${M.collected} of 5`);
      }
    }
    if (M.collected >= 5) completeMission(G);
  }
  if (id === 'fare' && M.fare) {
    if (M.stage === 0 && near(M.fare.from[0], M.fare.from[1], 10)) {
      M.stage = 1;
      setBeacon(G, ...M.fare.to);
      G.hud.objective(`Deliver the fare — $${M.fare.pay}`);
    } else if (M.stage === 1 && near(M.fare.to[0], M.fare.to[1], 10)) {
      completeMission(G);
    }
  }
}
