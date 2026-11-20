// Solmar Bay — shared constants, tuning and small math helpers.
// Original game, written for the make.fun gta6-01 bounty. Nothing here is
// from any other game: all names, places and numbers are our own.

// ---- World layout -------------------------------------------------------
// A 10x10-block grid city. Roads run on a regular pitch; each block holds
// procedural buildings, and the west edge is a beach with the sea beyond it.
export const WORLD = {
  PITCH: 54, // distance between neighbouring road centrelines (m)
  BLOCK: 40, // building block side (m)
  ROAD: 14, // road width (m)
  GRID: 5, // roads at k * PITCH for k in -GRID..GRID
  CITY_HALF: 270, // playable half-extent (m)
  BEACH_X: -297, // sand strip starts here (west edge)
  SEA_X: -340, // water plane starts here
  CANAL_Z: 297, // canal along the south edge
  SEED: 1337, // fixed seed: the same city every run
};

// ---- Palette ------------------------------------------------------------
export const COLORS = {
  sky: 0x87bfe8,
  fog: 0x9fc8e8,
  sun: 0xfff2d0,
  asphalt: 0x33363c,
  asphaltLine: 0xd8d8d8,
  sidewalk: 0x9a938a,
  sand: 0xe8d29a,
  sea: 0x2f7fb8,
  grass: 0x5da24a,
  plaza: 0xb9a98c,
  fountain: 0x4fa8d8,
  building: [0xc9a06a, 0x8fa3b8, 0xb87a6a, 0x9a8fb0, 0x6a8a7a, 0xd8c9a8, 0x7a6a8a],
  roof: [0x5a4a3a, 0x6a6a6a, 0x8a5a4a],
  palmTrunk: 0x7a5a38,
  palmLeaf: 0x3f8a3a,
  lamp: 0x2a2a2a,
  lampGlow: 0xffe9a8,
  carPaint: [0xc23a2e, 0x2e6ac2, 0xe8c832, 0x3a3a3a, 0xe8e8e8, 0x2e8a4a, 0x8a2e6a, 0xc26a2e],
  policePaint: 0x1a2a4a,
  policeLightR: 0xff2a2a,
  policeLightB: 0x2a4aff,
  thug: 0x3a2a3a,
  marker: 0xffc832,
  pickup: 0x32d832,
};

// ---- Tuning -------------------------------------------------------------
export const TUNE = {
  walkSpeed: 6,
  runSpeed: 10.5,
  jumpSpeed: 8.5,
  gravity: 24,
  carAccel: 14,
  carBrake: 26,
  carReverse: 8,
  carMaxSpeed: 30, // ~108 km/h
  carMaxReverse: 9,
  carSteer: 1.9,
  carDrag: 0.6,
  trafficCount: 14,
  pedCount: 22,
  cashPickupCount: 8,
  pickupValue: 50,
  pickupRespawn: 60, // seconds until a collected cash pickup comes back
  bustedFine: 100,
  wastedFine: 150,
  wantedDecayDelay: 12, // seconds with no crime before stars start to fall
  wantedDecayStep: 8, // seconds per lost star while hidden
  wantedSightRange: 42, // police "see" the player inside this range
  pistolMag: 12,
  pistolReserve: 48,
  pistolReload: 1.2, // seconds
  pistolRange: 70,
  pistolDamage: 34,
  punchDamage: 20,
  punchRange: 2.2,
  punchCooldown: 0.45,
  thugHp: 68,
  playerHp: 100,
  missionTimeM3: 90, // Clockwork countdown, seconds
};

// ---- Missions -----------------------------------------------------------
// Rico Vega runs jobs for fixer Delgado across Solmar Bay. Missions 1-4 are
// playable; M5 unlocks only once the first four are done.
export const MISSIONS = [
  {
    id: 1, name: 'First Wheels', reward: 250,
    briefing: 'Delgado: "Rico, welcome back. Steal a car and bring it to the plaza marker. Keep it clean."',
    objective: 'Steal a car, then drive to the plaza marker',
  },
  {
    id: 2, name: 'The Getaway', reward: 300,
    briefing: 'Delgado: "Package is waiting at the docks. Grab it, then lose the heat and reach the safehouse."',
    objective: 'Pick up the package at the docks, then reach the safehouse',
  },
  {
    id: 3, name: 'Clockwork', reward: 400,
    briefing: 'Delgado: "Ninety seconds. A parcel, across town, no excuses. The clock is already running."',
    objective: 'Deliver across the city — 90 seconds!',
  },
  {
    id: 4, name: 'The Informant', reward: 500,
    briefing: 'Delgado: "Meet the informant in the park, on foot. It is a setup — bring the pistol."',
    objective: 'Meet the informant in the park, survive the ambush',
  },
  {
    id: 5, name: 'The Big One', reward: 1200,
    briefing: 'Delgado: "One last job, Rico. The vault, the bridge, the whole bay watching. Finish the first four first."',
    objective: 'Locked — finish missions 1–4 to unlock',
  },
];

// ---- Key places in the city (world coordinates) --------------------------
export const PLACES = {
  plaza: { x: 0, z: 0 }, // mission 1 marker, city centre
  docks: { x: -270, z: 162 }, // mission 2 pickup, west beach road
  safehouse: { x: 270, z: -162 }, // mission 2 + 4 escape point, east edge
  delivery: { x: 216, z: 216 }, // mission 3 drop-off, south-east corner
  park: { x: 135, z: -81 }, // mission 4 meeting point, park block
  spawn: { x: 0, z: 162 }, // player start, central avenue
};

// ---- Math helpers --------------------------------------------------------
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx; const dz = az - bz; return Math.hypot(dx, dz); }
// Smallest signed angle difference, in radians.
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function angleLerp(a, b, t) { return a + angleDiff(a, b) * clamp(t, 0, 1); }
