# Solmar Bay — a night in the city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). One night in
Solmar Bay: Rico Marlowe owes Vera Costa one last night of work. Steal cars,
run fares, dodge the Solmar Bay PD and their helicopter, and make the
lighthouse cache before dawn.

## The game

- A night city to explore on foot and by car: neon signs, lit windows, street
  lamps, a lighthouse beam, the moon over the northern sea
- Traffic and pedestrians, cars to steal and drive (sedan, pickup, the
  "Coast Runner" motorcycle, a skiff), a wanted system with police
  interceptors and a helicopter with a spotlight at four stars
- Six story missions plus repeatable taxi fares, a garage with repairs and
  upgrades, combat, a HUD with a minimap, and a save
- Runs offline from static files: serve `game/` and open `index.html`

## Play

WASD move / drive · E enter or leave a car · Click shoot · Space handbrake ·
G garage · T taxi fare (after the story)

## Build

`node main.ts` writes the game, screenshots and dossier to `/output`
(`MAKEFUN_OUTPUT_DIR` outside the grader). Serve locally with
`node serve.ts` and open http://localhost:8080.
