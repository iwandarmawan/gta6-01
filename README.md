# Solmar Bay — Dawn Patrol

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world game built for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun: a golden-hour dawn city on the coast, rendered with vendored three.js and plain Node 22 — no network at runtime.

**The city:** Solmar Bay wakes up at sunrise. Low warm sun in the east, long shadows pointing west, morning fog lifting off the southern sea, lamps still glowing, headlights on, birds crossing the dawn sky. Palm Plaza, Rico's Garage, the marina, the airfield and the lighthouse point, all reachable on foot or by vehicle.

**The story:** Rico Marlowe and Vera Costa run six missions — First Wheels ($150), Harbour Escape ($300), City Taxi ($250, 90s), Sunset Courier ($400, 120s, 3 drops), Rooftop Leap ($350) and Lighthouse Cache ($500, 5 packages) — plus repeatable taxi fares. Earn cash, buy garage upgrades (repair $50, engine $400 for +25% speed, armor $300 for +50 HP), and dodge a 5-star wanted system with police interceptors and a helicopter spotlight at 4 stars and up.

**The fleet:** sedan, pickup, the "Coast Runner" motorcycle (top speed 34), a skiff for the harbour, and police interceptors to steal if you dare. 18 pedestrians, ambient traffic, a save system, shooting, and a HUD with a live minimap.

## Play

Open `game/index.html` in a desktop browser (offline, no server needed). WASD to drive or walk, E to enter/exit a vehicle or interact, F to shoot, Shift to run.

## Build

`node main.ts` writes the deterministic dossier to `/output` (or `$MAKEFUN_OUTPUT_DIR`).
