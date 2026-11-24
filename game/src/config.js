// Solmar Bay, sunset edition: every number the game shares. The city is a
// coastal grid with the sea on the WEST, so the sun sets over the water.
// v9 was a bright midday beach chase; v10 is dusk, and the districts are
// rearranged: the marina is north-west, the airfield is east, the lighthouse
// point is south-west, Palm Plaza stays at the centre.

// Street grid (both axes), in metres. The city runs x -140..140, z -200..200.
export const STREETS_X = [-120, -80, -40, 0, 40, 80, 120];
export const STREETS_Z = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const CITY = { minX: -140, maxX: 140, minZ: -200, maxZ: 200 };

// The coast. Sea west of seaX; the beach strip; the coast road the chase runs on.
export const COAST = { seaX: -150, beachX0: -168, beachX1: -140, roadX: -145 };

// Points of interest. Marina north-west, airfield east, lighthouse south-west.
export const POIS = {
  lighthouse: { x: -192, z: -178, label: 'Lighthouse Point' },
  marina: { x: -158, z: 150, label: 'Marina' },
  airfield: { x: 168, z: -70, label: 'Airfield' },
  plaza: { x: 0, z: 0, label: 'Palm Plaza' },
  garage: { x: 35, z: 28, label: "Rico's Garage" },
};

// Sunset palette: warm low sun, orange-pink sky, lights just coming on.
export const SUNSET = {
  skyTop: 0x2e1a52,
  skyMid: 0xff7e5f,
  skyLow: 0xffc46b,
  fog: 0xc96a4e,
  sun: 0xffb36b,
  sunDisc: 0xffd27a,
  hemiSky: 0xff9a7a,
  hemiGround: 0x5a3a4a,
  sea: 0x35356b,
  seaGlitter: 0xff9a4a,
  beach: 0xd9a066,
  ground: 0x7a6a58,
  road: 0x3d3542,
  roadLine: 0xd8c98a,
  building: [0xb5654a, 0xc98a5a, 0x8a5a6a, 0x6a5a7a, 0xa88a5a, 0x7a6a8a],
  roof: 0x4a3542,
  windowLit: 0xffd27a,
  windowDark: 0x2a2438,
  palmTrunk: 0x6a4a32,
  palmLeaf: 0x3f6a34,
  lighthouseWhite: 0xf2e8d8,
  lighthouseRed: 0xc94a3a,
  lamp: 0xffc46b,
};

export const PRICES = { repair: 50, engine: 400, armor: 300 };
export const ENGINE_BONUS = 0.25; // +25% top speed per engine level
export const ARMOR_BONUS = 50; // +50 max HP per armor level

// Vehicle specs: top speed m/s, acceleration, steering. Coast Runner tops at 34.
export const VEHICLES = {
  sedan: { top: 34, accel: 14, turn: 2.2, color: 0xc22a2a, name: 'Sedan' },
  pickup: { top: 32, accel: 13, turn: 2.0, color: 0xe07a1e, name: 'Pickup' },
  bike: { top: 34, accel: 18, turn: 2.8, color: 0x2a6ac2, name: 'Coast Runner' },
  skiff: { top: 22, accel: 8, turn: 1.6, color: 0xe8e4da, name: 'Skiff' },
  interceptor: { top: 36, accel: 16, turn: 2.4, color: 0x1a1a22, name: 'PD Interceptor' },
};

// The six-mission story arc for Rico Marlowe and Vera Costa.
export const MISSIONS = [
  {
    id: 'wheels',
    name: 'First Wheels',
    reward: 150,
    time: 0,
    intro: 'Vera needs wheels. Steal the red sedan at Palm Plaza.',
    stages: [
      { text: 'Steal a car (walk up and press E)', x: 0, z: 10, r: 6, need: 'enterCar' },
    ],
  },
  {
    id: 'harbour',
    name: 'Harbour Escape',
    reward: 300,
    time: 0,
    intro: 'The cops are coming. Take the skiff at the marina and run for the lighthouse.',
    stages: [
      { text: 'Board the skiff at the marina', x: -158, z: 150, r: 8, need: 'boardBoat' },
      { text: 'Reach the lighthouse point', x: -192, z: -178, r: 12, need: 'reach' },
    ],
  },
  {
    id: 'taxi',
    name: 'City Taxi',
    reward: 250,
    time: 90,
    intro: 'A fare is waiting at Palm Plaza. Get them to the airfield before the meter runs out.',
    stages: [
      { text: 'Pick up the fare at Palm Plaza — 90s', x: 0, z: 0, r: 8, need: 'reach' },
      { text: 'Drop the fare at the airfield', x: 168, z: -70, r: 10, need: 'reach' },
    ],
  },
  {
    id: 'courier',
    name: 'Sunset Courier',
    reward: 400,
    time: 120,
    intro: 'Three drops before dark: plaza, garage, marina. Do not dawdle.',
    stages: [
      { text: 'Drop 1 of 3: Palm Plaza', x: 0, z: 0, r: 8, need: 'reach' },
      { text: "Drop 2 of 3: Rico's Garage", x: 35, z: 28, r: 8, need: 'reach' },
      { text: 'Drop 3 of 3: Marina', x: -158, z: 150, r: 8, need: 'reach' },
    ],
  },
  {
    id: 'leap',
    name: 'Rooftop Leap',
    reward: 350,
    time: 0,
    intro: 'Vera bet the airfield ramp can fly a car. Prove her right — hit it fast.',
    stages: [
      { text: 'Hit the airfield ramp at speed', x: 150, z: -70, r: 10, need: 'speed', speed: 20 },
    ],
  },
  {
    id: 'cache',
    name: 'Lighthouse Cache',
    reward: 500,
    time: 0,
    intro: 'Five packages are stashed at the lighthouse point. Collect them all.',
    stages: [
      { text: 'Collect the cache at the lighthouse point', x: -192, z: -178, r: 12, need: 'reach' },
    ],
  },
];

// Repeatable taxi fares between districts.
export const FARES = [
  { from: 'plaza', to: 'airfield', reward: 120 },
  { from: 'airfield', to: 'marina', reward: 150 },
  { from: 'marina', to: 'plaza', reward: 140 },
];

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 9,
  maxHealth: 100,
  startCash: 0,
};

export const WANTED = {
  stealCar: 1,
  shootPed: 2,
  shootCop: 2,
  decaySeconds: 25,
  bustFine: 100,
  deathFine: 150,
};
