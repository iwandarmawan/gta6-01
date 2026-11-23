# Solmar Bay

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game: a sun-soaked coastal city you explore
on foot and by car, with traffic, pedestrians, a wanted level and police
who chase you, three story missions, a boat to sail, and a day/night
cycle. Every name, place and sound in it is invented for this game.

## The city

Solmar Bay is a coastal island with two districts — Downtown and
Portside — joined by a bridge over a harbour channel, plus a beach,
a marina, a lighthouse and a plaza. Drive the avenues, steal a parked
car, run jobs for Rico at his garage, and watch the wanted stars climb
when the law notices.

## Missions (in order, from Rico's Garage — follow the $ beacon)

1. **Harbour Hustle** — pick up a client at Marina Bay and drop them at
   the Solmar Grand Hotel before the clock runs out. Pays $150.
2. **Package Run** — collect three parcels around the city and bring
   them to the garage. Each pickup draws police heat. Pays $250.
3. **Harbour Escape** — take the boat from Marina Dock, sail out to
   the harbour buoy and bring her back. Pays $400.

Finish all three and Rico pays a $500 story bonus. Cash pays for car
repairs at the garage ($50). Your cash and progress save in the
browser.

## Controls

- **WASD** — move on foot / drive (W accelerate, S brake and reverse)
- **E** — enter a car or the boat, step out, start a mission
- **F** — punch (on foot; draws police heat)
- **Shift** — run · **Space** — handbrake
- **Mouse drag** — orbit the camera · **Wheel** — zoom
- **P / Esc** — pause · **M** — mute · **R** — repair at the garage / retry

## Run it

Serve the repository root with any static server and open the game,
for example:

```
node serve.ts
```

then open http://localhost:8080 (the game lives at `game/index.html`).
Everything runs offline: three.js is vendored under `game/vendor/`,
all sound is synthesized with WebAudio, and no network request is
made at run time.

Bounty: https://make.fun/bounty/gta6-01
