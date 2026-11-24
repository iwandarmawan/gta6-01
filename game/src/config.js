// Solmar Bay configuration: the island layout, the palette, the vehicles,
// the garage prices and the mission arc. One place for every number the
// rest of the game reads, so a tweak never means hunting through files.

export const WORLD = {
  minX: -220,
  maxX: 220,
  minZ: -180,
  maxZ: 180,
  coastZ: 180,
  westX: -220,
  // The channel cuts in from the south coast; the bridge road crosses it.
  channel: { x0: 30, x1: 90, z0: 90, z1: 180 },
  bridgeZ: 120,
  bridgeX0: 30,
  bridgeX1: 90,
};

export const ROADS_X = [-200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200];
export const ROADS_Z = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const ROAD_WIDTH = 10;
export const BLOCK = 40;

export const PALETTE = {
  land: 0x9db380,
  sand: 0xe8d9a0,
  sea: 0x2e7f9e,
  seaDeep: 0x1d5a74,
  road: 0x3a3a40,
  sidewalk: 0xb9b3a4,
  building: [0xf2e3c6, 0xe8b48c, 0xd98a6a, 0x9fc3d4, 0xf6d98c, 0xc9a6c9, 0x8fb8a8, 0xe8e0d0],
  roof: [0x8a4a3a, 0x5a6a7a, 0x7a7a6a, 0x4a5a6a],
  palmTrunk: 0x7a5a38,
  palmLeaf: 0x3f8f4f,
  lighthouse: 0xf2f2f2,
  lighthouseTop: 0xd43a2a,
};

export const VEHICLES = {
  sedan: { name: 'Solmar Sedan', topSpeed: 30, accel: 14, brake: 26, turn: 1.9, seats: 1, length: 4.4, width: 2.0, height: 1.4, colors: [0xc23a2e, 0x2e5ac2, 0xe8e0d0, 0x3a3a40, 0x2e8f5a] },
  pickup: { name: 'Bay Pickup', topSpeed: 27, accel: 12, brake: 24, turn: 1.7, seats: 1, length: 5.2, width: 2.1, height: 1.7, colors: [0xd98a2a, 0x5a7a8a, 0x8a2a3a] },
  bike: { name: 'Coast Runner', topSpeed: 34, accel: 18, brake: 30, turn: 2.6, seats: 1, length: 2.2, width: 0.8, height: 1.2, colors: [0xd4a017, 0x222222, 0xc23a2e] },
  boat: { name: 'Marina Skiff', topSpeed: 24, accel: 10, brake: 14, turn: 1.4, seats: 1, length: 6.0, width: 2.4, height: 1.0, colors: [0xf2f2f2, 0x2e7f9e] },
  police: { name: 'Solmar PD Interceptor', topSpeed: 33, accel: 16, brake: 28, turn: 2.1, seats: 1, length: 4.6, width: 2.0, height: 1.45, colors: [0x1a2a4a] },
};

export const GARAGE = {
  pos: { x: -20, z: 24 },
  repairCost: 50,
  engineCost: 400,
  armorCost: 300,
  engineBonus: 1.25,
  armorBonus: 50,
};

export const START = { pos: { x: -8, z: -8 }, angle: Math.PI * 0.75 };

export const DAY_LENGTH = 240; // seconds for one full day/night cycle

// The story arc: Rico Marlowe, new in Solmar Bay, runs jobs for Vera Costa.
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    giver: 'Vera Costa',
    brief: 'Vera needs wheels. Steal any car and bring it to the garage on Marlin Street.',
    reward: 150,
    steps: [
      { type: 'enter', vehicle: 'any', text: 'Steal a car (walk up and press E)' },
      { type: 'goto', x: -20, z: 24, radius: 8, text: 'Drive to Rico\u2019s Garage' },
    ],
  },
  {
    id: 'harbour-escape',
    title: 'Harbour Escape',
    giver: 'Vera Costa',
    brief: 'The heat is on. Take the skiff from the marina, run the channel and reach the lighthouse point.',
    reward: 300,
    wanted: 2,
    steps: [
      { type: 'enter', vehicle: 'boat', text: 'Board the skiff at the marina (press E)' },
      { type: 'goto', x: -196, z: 150, radius: 10, text: 'Reach the lighthouse point' },
    ],
  },
  {
    id: 'taxi-fare',
    title: 'City Taxi',
    giver: 'Vera Costa',
    brief: 'A fare is waiting at Palm Plaza. Pick them up and drop them at the airfield before the clock runs out.',
    reward: 250,
    timeLimit: 90,
    steps: [
      { type: 'goto', x: 0, z: 0, radius: 8, text: 'Pick up the fare at Palm Plaza' },
      { type: 'goto', x: 165, z: -155, radius: 10, text: 'Drop the fare at Solmar Airfield' },
    ],
  },
  {
    id: 'courier',
    title: 'Sunset Courier',
    giver: 'Vera Costa',
    brief: 'Three parcels, three drops, one sunset. Deliver them all before the timer runs out.',
    reward: 400,
    timeLimit: 120,
    steps: [
      { type: 'goto', x: -160, z: -120, radius: 8, text: 'Drop 1 of 3: North Row' },
      { type: 'goto', x: 160, z: 80, radius: 8, text: 'Drop 2 of 3: Portside Market' },
      { type: 'goto', x: -120, z: 120, radius: 8, text: 'Drop 3 of 3: Marina Steps' },
    ],
  },
  {
    id: 'stunt-jump',
    title: 'Rooftop Leap',
    giver: 'Vera Costa',
    brief: 'There is a jump ramp by the bridge. Hit it fast and land inside the marked zone.',
    reward: 350,
    steps: [
      { type: 'enter', vehicle: 'any', text: 'Get in a car first' },
      { type: 'jump', x: 60, z: 120, radius: 14, text: 'Hit the ramp and land in the zone' },
    ],
  },
  {
    id: 'lighthouse-cache',
    title: 'Lighthouse Cache',
    giver: 'Vera Costa',
    brief: 'Five packages are stashed around the bay. Find them all and Vera pays for every one.',
    reward: 500,
    steps: [
      { type: 'collect', count: 5, text: 'Collect the stashed packages (0/5)' },
    ],
  },
];

export const CACHE_SPOTS = [
  { x: -180, z: -140 },
  { x: 180, z: -40 },
  { x: -60, z: 160 },
  { x: 120, z: 160 },
  { x: -196, z: 60 },
];

export const TAXI_FARES = [
  { from: { x: 0, z: 0 }, to: { x: 165, z: -155 }, pay: 120 },
  { from: { x: -160, z: 80 }, to: { x: 160, z: -80 }, pay: 150 },
  { from: { x: 120, z: 160 }, to: { x: -180, z: -120 }, pay: 140 },
];
