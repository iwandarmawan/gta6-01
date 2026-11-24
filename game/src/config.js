// Solmar Bay — Foggy Morning. Layout seed 15, sea WEST (x < -150).
// The fog palette: pale blue-grey sky, muted towers, lamps still glowing,
// headlights cutting through the mist, wet streets from the night's rain.
export const LAYOUT_SEED = 15;
export const GRID_OFFSET = -4;
export const SEA_EDGE = -150; // x < SEA_EDGE is open water

export const PLAZA = { x: 0, z: 0 };
export const GARAGE = { x: 35, z: 28 };
export const LIGHTHOUSE = { x: -178, z: 0 };
export const MARINA = { x: -152, z: 120 };
export const AIRFIELD = { x: 168, z: -70 };
export const CITY_BOUND = 200;

export const COLORS = {
  sky: 0xaebac2,
  fog: 0x9fb0ba,
  ground: 0x2a3138,
  road: 0x1c2126,
  roadLine: 0xc8cdd2,
  sea: 0x2e4a5e,
  seaDeep: 0x22384a,
  building: 0x5a6672,
  buildingDark: 0x46525e,
  windowLit: 0xffd98a,
  windowCool: 0x9fc4e8,
  palm: 0x2e4d33,
  trunk: 0x6b4a2f,
  lampGlow: 0xffe6a8,
  lighthouse: 0xd8d3c8,
  beacon: 0xffc94d,
  runway: 0x23282e,
};

export const MISSIONS = [
  { id: 'first-wheels', name: 'First Wheels', pay: 150, text: 'Steal a car' },
  { id: 'harbour-escape', name: 'Harbour Escape', pay: 300, text: 'Reach the marina by boat' },
  { id: 'city-taxi', name: 'City Taxi', pay: 250, text: 'Pick up the fare at Palm Plaza', timer: 90 },
  { id: 'sunset-courier', name: 'Sunset Courier', pay: 400, text: 'Deliver 3 drops across the city', drops: 3, timer: 120 },
  { id: 'rooftop-leap', name: 'Rooftop Leap', pay: 350, text: 'Reach the lighthouse point' },
  { id: 'lighthouse-cache', name: 'Lighthouse Cache', pay: 500, text: 'Collect 5 packages at the lighthouse', packages: 5 },
];

export const TAXI_FARES = [120, 150, 140];
export const GARAGE_PRICES = { repair: 50, engine: 400, armor: 300 };
export const VEHICLE_TOP_SPEEDS = { sedan: 32, pickup: 30, bike: 34, boat: 22, police: 33 };
