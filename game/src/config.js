// Solmar Bay: every number the game shares. One place, so a tweak lands everywhere.
export const WORLD = 420; // city spans -210..210 on x and z
export const ROAD_EVERY = 60; // road grid spacing
export const ROAD_W = 10; // road width
export const SEA_X = 190; // sea starts here (east edge)
export const BEACH_X = 150; // sand starts here
export const PLAYER_WALK_SPEED = 6;
export const PLAYER_HP_MAX = 100;
export const BUST_FINE = 100;

// Vehicle kinds: top speed (m/s), acceleration, handling. Names are the game's own.
export const VEHICLES = {
  sedan: { name: 'Solmar Sedan', top: 30, accel: 14, steer: 1.9, color: 0xc23b2e, kind: 'car' },
  pickup: { name: 'Bay Pickup', top: 26, accel: 12, steer: 1.7, color: 0xe07b1f, kind: 'car' },
  moto: { name: 'Coast Runner', top: 34, accel: 18, steer: 2.4, color: 0x1f6fd6, kind: 'moto' },
  boat: { name: 'Marina Skiff', top: 22, accel: 10, steer: 1.4, color: 0xf2f2f2, kind: 'boat' },
  police: { name: 'Solmar PD Interceptor', top: 32, accel: 16, steer: 2.1, color: 0x1a2a44, kind: 'car' },
};

// The story arc: Rico Marlowe runs jobs for Vera Costa across Solmar Bay.
export const MISSIONS = [
  { id: 'wheels', name: 'First Wheels', pay: 150, text: 'Steal a car (walk up and press E)' },
  { id: 'harbour', name: 'Harbour Escape', pay: 300, text: 'Reach the lighthouse point' },
  { id: 'taxi', name: 'City Taxi', pay: 250, time: 90, text: 'Pick up the fare at Palm Plaza' },
  { id: 'courier', name: 'Sunset Courier', pay: 400, time: 120, text: 'Deliver the packages' },
  { id: 'leap', name: 'Rooftop Leap', pay: 350, text: 'Hit the ramp at full speed' },
  { id: 'cache', name: 'Lighthouse Cache', pay: 500, text: 'Collect the packages' },
];

// Repeatable taxi fares once the story is rolling.
export const FARES = [
  { from: [0, 0], to: [-120, -150], pay: 120, label: 'Palm Plaza to the airfield' },
  { from: [120, 60], to: [-60, 120], pay: 150, label: 'Marina to Rico\'s Garage' },
  { from: [-120, 60], to: [120, -60], pay: 140, label: 'West End to the beach road' },
];

// Rico's Garage: repair and upgrades, paid from the player's cash.
export const GARAGE = {
  pos: [-30, 90],
  repair: { name: 'Repair', price: 50 },
  engine: { name: 'Engine tune (+25% speed)', price: 400 },
  armor: { name: 'Armor plating (+50 HP)', price: 300 },
};

export const LIGHTHOUSE = [175, -185]; // the point the harbour mission ends at
export const MARINA = [170, 80]; // where the skiff waits
export const PLAZA = [0, 0]; // Palm Plaza, the city centre
export const AIRFIELD = [-150, -155]; // the south-west runway
export const RAMP = [60, -120]; // the rooftop-leap ramp
