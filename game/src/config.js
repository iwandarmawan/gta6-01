// Solmar Bay: the numbers that shape the city, the cars, the missions and the economy.
// Every value here is the game's own; nothing is borrowed from another game.
export const WORLD = {
  minX: -220, maxX: 220, minZ: -160, maxZ: 160,
  seaX: 190, sandX0: 160, sandX1: 190,
};

// Roads run on a grid: six north-south, five east-west, each 10 wide.
export const ROADS_X = [-150, -90, -30, 30, 90, 150];
export const ROADS_Z = [-120, -60, 0, 60, 120];
export const ROAD_W = 10;

// Landmarks, all in world coordinates (x east, z south).
export const PLAZA = { x: 60, z: 0 };
export const GARAGE = { x: -60, z: 60 };
export const MARINA = { x: 210, z: 70 };
export const LIGHTHOUSE = { x: 170, z: -140 };
export const AIRFIELD = { x: -200, z: -100 };
export const HOSPITAL = { x: 0, z: 0 };

export const PALETTE = {
  grass: 0x6fae4e, sand: 0xdcc98f, sea: 0x2e7fa8, road: 0x2b2b2e,
  sidewalk: 0x9a9a92, building: [0x8a7f72, 0x7d8a99, 0xa08a6a, 0x6f7d6a, 0x9c8f7d],
  roof: 0x4a4640, palmTrunk: 0x7a5230, palmLeaf: 0x2f7d32,
  dock: 0x6b4a2f, lighthouse: 0xf2f2f2, lighthouseTop: 0xc0392b,
};

// One vehicle kind: how fast it goes, how it turns, how tough it is.
export const VEHICLES = {
  sedan:   { top: 26, accel: 14, brake: 26, turn: 1.9, color: 0xc0392b, name: 'Sedan' },
  pickup:  { top: 24, accel: 12, brake: 24, turn: 1.7, color: 0xd35400, name: 'Pickup' },
  bike:    { top: 34, accel: 18, brake: 30, turn: 2.6, color: 0x2980b9, name: 'Coast Runner' },
  boat:    { top: 22, accel: 10, brake: 18, turn: 1.4, color: 0xecf0f1, name: 'Skiff' },
  police:  { top: 30, accel: 16, brake: 28, turn: 2.1, color: 0x2c3e50, name: 'PD Interceptor' },
};

// Rico Marlowe's story, told as six jobs for Vera Costa, then repeatable fares.
export const MISSIONS = [
  {
    id: 'wheels', name: 'First Wheels', reward: 150, time: 0,
    intro: 'Vera needs a driver. Steal a car first.',
    steps: [
      { text: 'Steal a car (walk up and press E)', target: { x: 60, z: 32 }, radius: 6, kind: 'steal' },
    ],
  },
  {
    id: 'harbour', name: 'Harbour Escape', reward: 300, time: 0,
    intro: 'The PD is onto us. Take the skiff and run for the lighthouse.',
    steps: [
      { text: 'Board the skiff at the marina', target: { x: 205, z: 70 }, radius: 8, kind: 'boardBoat' },
      { text: 'Reach the lighthouse point', target: { x: 170, z: -140 }, radius: 14, kind: 'reach' },
    ],
  },
  {
    id: 'taxi', name: 'City Taxi', reward: 250, time: 90,
    intro: 'A fare is waiting at Palm Plaza. Ninety seconds, no excuses.',
    steps: [
      { text: 'Pick up the fare at Palm Plaza', target: { x: 60, z: 0 }, radius: 8, kind: 'pickup' },
      { text: 'Drop the fare at the airfield', target: { x: -200, z: -100 }, radius: 10, kind: 'dropoff' },
    ],
  },
  {
    id: 'courier', name: 'Sunset Courier', reward: 400, time: 120,
    intro: 'Three drops before sunset. Vera is counting on you.',
    steps: [
      { text: 'Deliver the package (1 of 3)', target: { x: 30, z: -120 }, radius: 8, kind: 'reach' },
      { text: 'Deliver the package (2 of 3)', target: { x: -90, z: 120 }, radius: 8, kind: 'reach' },
      { text: 'Deliver the package (3 of 3)', target: { x: 150, z: -60 }, radius: 8, kind: 'reach' },
    ],
  },
  {
    id: 'leap', name: 'Rooftop Leap', reward: 350, time: 0,
    intro: 'The airfield ramp is the only way over the fence. Floor it.',
    steps: [
      { text: 'Hit the airfield ramp at speed', target: { x: -180, z: -100 }, radius: 10, kind: 'reach' },
      { text: 'Land past the marker', target: { x: -120, z: -100 }, radius: 12, kind: 'reach' },
    ],
  },
  {
    id: 'cache', name: 'Lighthouse Cache', reward: 500, time: 0,
    intro: 'Five packages stashed around the lighthouse. Collect them all.',
    steps: [
      { text: 'Collect the cache (1 of 5)', target: { x: 160, z: -130 }, radius: 6, kind: 'collect' },
      { text: 'Collect the cache (2 of 5)', target: { x: 180, z: -150 }, radius: 6, kind: 'collect' },
      { text: 'Collect the cache (3 of 5)', target: { x: 165, z: -155 }, radius: 6, kind: 'collect' },
      { text: 'Collect the cache (4 of 5)', target: { x: 175, z: -125 }, radius: 6, kind: 'collect' },
      { text: 'Collect the cache (5 of 5)', target: { x: 155, z: -145 }, radius: 6, kind: 'collect' },
    ],
  },
];

// Repeatable taxi fares once the story is done (press T when free).
export const FARES = [
  { from: { x: 60, z: 0 }, to: { x: -200, z: -100 }, reward: 120, fromName: 'Palm Plaza', toName: 'Airfield' },
  { from: { x: -200, z: -100 }, to: { x: 210, z: 70 }, reward: 150, fromName: 'Airfield', toName: 'Marina' },
  { from: { x: 210, z: 70 }, to: { x: 60, z: 0 }, reward: 140, fromName: 'Marina', toName: 'Palm Plaza' },
];

export const GARAGE_PRICES = { repair: 50, engine: 400, armor: 300 };
export const PLAYER = { walk: 6, run: 9, hp: 100, armoredHp: 150 };
export const WANTED = { steal: 1, hitPed: 1, shoot: 1, harbourStart: 2, decaySeconds: 30, bustFine: 100 };
