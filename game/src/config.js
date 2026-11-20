// Solmar Bay — every tuning number in one place. The city is a 10x10 block
// grid on a 48 m pitch; the beach sits on the east edge, the plaza at the
// centre. Nothing here depends on the screen size: the renderer scales the
// 3D view to the window and the HUD is DOM.

export const WORLD = {
  grid: 10, // blocks each way
  block: 36, // a block is 36 m across
  road: 12, // roads are 12 m wide
  pitch: 48, // 48 m from one road centre to the next
  half: 240, // city edge: 10 * 48 / 2
  beachX: 280, // sand ends here, the sea begins
  seed: 1337, // the deterministic city seed
};

export const STEP = 1 / 60; // fixed simulation step, 60 updates a second

/** The chase camera's lens: a 62-degree field of view, near and far planes. */
export const CAMERA = { fov: 62, near: 0.1, far: 1200 };

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  jumpSpeed: 8,
  gravity: 22,
  radius: 0.7,
  health: 100,
  healthRegen: 2, // HP per second while the heat is off
};

export const CAR = {
  accel: 16,
  brake: 30,
  maxSpeed: 38,
  maxReverse: 12,
  steer: 1.9,
  grip: 6,
  radius: 2.3,
  damagePerHit: 12,
  smokeAt: 55, // damage above this starts smoking
};

export const TRAFFIC = {
  count: 10,
  speed: 9,
  minGap: 14,
};

export const PEDS = { count: 18, walkSpeed: 1.6, fleeSpeed: 5.2 };

export const POLICE = {
  maxCars: 3,
  chaseSpeed: 34,
  ramDamage: 8,
  ramCooldown: 0.8, // seconds between ram hits from one police car
  bustTime: 1.5, // seconds of contact on foot before busted
  decayDelay: 8, // quiet seconds before one star fades
  roadblockAt: 3, // wanted level that puts roadblocks up
};

export const COMBAT = {
  magSize: 12,
  reserveMax: 48,
  reloadTime: 1.2,
  pistolDamage: 34,
  punchDamage: 25,
  punchRange: 2.2,
  shotRange: 90,
};

export const MISSIONS = [
  { id: 1, name: 'First Wheels', reward: 250, brief: 'Delgado needs wheels. Steal any car and bring it to the plaza marker.' },
  { id: 2, name: 'The Getaway', reward: 300, brief: 'Pick up the package at the docks, then lose the heat and reach the safehouse.' },
  { id: 3, name: 'Clockwork', reward: 400, brief: 'A 90-second delivery across the city. Late means nothing — do not be late.' },
  { id: 4, name: 'The Informant', reward: 500, brief: 'Meet the informant in the park on foot. It is a setup — bring the pistol.' },
  { id: 5, name: 'The Big One', reward: 1000, brief: 'Locked. Finish the first four jobs and Delgado will call.' },
];

export const ECONOMY = {
  pickupValue: 50,
  bustCost: 100,
  wastedCost: 150,
  startCash: 0,
};

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  run: ['ShiftLeft', 'ShiftRight'],
  enter: ['KeyE'],
  punch: ['KeyF'],
  reload: ['KeyR'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'Space'],
  mute: ['KeyM'],
  weapon: ['Digit1', 'Digit2'],
};

export const SAVE_KEY = 'solmar-bay.save.v3';
export const COLORS = {
  sky: 0x8ec8ee,
  fog: 0x8ec8ee,
  ground: 0xb8b0a0,
  road: 0x33363c,
  sand: 0xe8d8a8,
  sea: 0x2f7fb8,
  plaza: 0xc9bda6,
  grass: 0x6fae5a,
  police: 0x1c2f6e,
  policeLight: 0xff2a2a,
  marker: 0xffc93c,
  pickup: 0x39d353,
};
