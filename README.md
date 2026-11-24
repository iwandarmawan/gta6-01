# Solmar Bay — Sunset Run

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built for [make.fun's gta6-01 bounty](https://make.fun/bounty/gta6-01). It runs offline in a desktop browser from the static files under `game/` — no network request, three.js vendored under `game/vendor/`.

## The game

Rico Marlowe is back in Solmar Bay as the sun goes down over the sea. Vera Costa has six jobs lined up before dark: steal wheels at Palm Plaza, escape by skiff to the lighthouse, drive timed fares, jump the airfield ramp, and lift the lighthouse cache — while the Solmar Bay PD watches from every corner.

- **A city at dusk**: a coastal grid with the sea on the west, a beach and coast road, a marina, an airfield, a lighthouse point, and Palm Plaza — warm low sun, long dusk light, street lamps just coming on.
- **On foot and by car**: steal a sedan, a pickup, the Coast Runner motorcycle, or a skiff; drive with arcade handling, or walk the sidewalks.
- **Traffic and pedestrians**: cars cruise the grid, walkers wander the sidewalks.
- **Wanted system**: steal a car or shoot and the stars climb; PD interceptors chase, and at four stars a police helicopter pins you in its spotlight. Get busted or wasted and you pay a fine.
- **Missions and a story**: six jobs for Rico and Vera, then repeatable taxi fares; a beacon pillar marks every objective.
- **Progression**: earn cash, spend it at Rico's Garage on repairs, engine upgrades (+25% top speed) and armor (+50 HP).
- **HUD with minimap**: wanted stars, cash, health, speed, compass, mission objective and timer, and a live minimap.
- **Save**: cash and upgrades persist in localStorage.

## Controls

WASD move / drive · E enter or leave a car · Click to shoot · M mission · G garage (near Rico's Garage) · P pause · Shift run

## Play

Serve `game/` with any static server (`node serve.ts`, then http://localhost:8080) and open `game/index.html`.

## License

MIT — see LICENSE.
