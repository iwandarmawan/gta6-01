# Solmar Bay — Storm Run

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for [make.fun's GTA 6 bounty](https://make.fun/bounty/gta6-01) — a rainstorm over Solmar Bay. Rico Marlowe steals cars, outruns the police through the rain, runs six missions for Vera Costa, and builds his ride at the garage.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any static server). No network, no build step — three.js is vendored under `game/vendor/`.

- **W A S D** — drive / walk, **E** — enter / exit car, **F** — shoot, **SPACE** — brake, **SHIFT** — run
- **1 / 2 / 3 at Rico's Garage** — repair $50 / engine $400 (+25% speed) / armor $300 (+50 HP)
- Six missions: First Wheels $150, Harbour Escape $300, City Taxi $250, Sunset Courier $400, Rooftop Leap $350, Lighthouse Cache $500 — then repeatable taxi fares. Wanted level 1–5 stars, police interceptors and a helicopter with a spotlight at 4+ stars, traffic, pedestrians, save system.

## Build

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's `vendor/makefun-game.ts` buildDossier.
